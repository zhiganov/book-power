import Anthropic from '@anthropic-ai/sdk';
import { encode } from 'gpt-tokenizer';
import type { BookContent, BookAnalysis, Principle, Framework } from '../types.js';
import { log } from '../logger.js';

const MODEL = 'claude-sonnet-4-20250514';
const MAX_CHAPTER_TOKENS = 8000;
const MAX_SYNTHESIS_TOKENS = 40000;

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic();
  }
  return client;
}

/**
 * Analyze a book using Claude to extract principles, frameworks, expertise, and tone.
 * For large books, processes chapter-by-chapter then synthesizes.
 */
export async function analyzeBook(book: BookContent): Promise<BookAnalysis> {
  log.header('Analyzing book with Claude...');

  const totalTokens = encode(
    book.chapters.map((ch) => ch.sections.map((s) => s.content).join('\n')).join('\n')
  ).length;

  log.info(`Book size: ~${totalTokens.toLocaleString()} tokens`);

  let chapterAnalyses: string[];

  if (totalTokens > MAX_SYNTHESIS_TOKENS) {
    // Process chapter-by-chapter for large books
    log.info('Large book detected — analyzing chapter by chapter');
    chapterAnalyses = [];

    for (const chapter of book.chapters) {
      log.info(`  Analyzing: ${chapter.title}`);
      const content = truncateToTokens(
        chapter.sections.map((s) => `## ${s.title}\n\n${s.content}`).join('\n\n'),
        MAX_CHAPTER_TOKENS
      );
      const analysis = await analyzeChapter(chapter.title, content);
      chapterAnalyses.push(analysis);
    }
  } else {
    // Process entire book at once
    const fullText = book.chapters
      .map((ch) => `# ${ch.title}\n\n${ch.sections.map((s) => s.content).join('\n\n')}`)
      .join('\n\n---\n\n');
    chapterAnalyses = [fullText];
  }

  // Synthesize all chapter analyses into final BookAnalysis
  const result = await synthesizeAnalysis(book, chapterAnalyses);

  log.success(`Analysis complete: ${result.principles.length} principles, ${result.frameworks.length} frameworks`);

  return result;
}

async function analyzeChapter(title: string, content: string): Promise<string> {
  const anthropic = getClient();

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: `Analyze this chapter from a book. Extract:
1. Key principles (name + 1-sentence description)
2. Any checklists, frameworks, or step-by-step processes
3. Notable advice or guidelines

Chapter: "${title}"

${content}

Respond in a structured format. Be concise but capture all distinct principles and frameworks.`,
      },
    ],
  });

  const block = response.content[0];
  return block.type === 'text' ? block.text : '';
}

async function synthesizeAnalysis(
  book: BookContent,
  chapterData: string[]
): Promise<BookAnalysis> {
  const anthropic = getClient();

  const input =
    chapterData.length === 1
      ? truncateToTokens(chapterData[0], MAX_SYNTHESIS_TOKENS)
      : chapterData
          .map((analysis, i) => `### Chapter ${i + 1}: ${book.chapters[i]?.title || 'Unknown'}\n\n${analysis}`)
          .join('\n\n---\n\n');

  const prompt = `You are analyzing a book to extract structured knowledge for generating tools.

Book: "${book.metadata.title}" by ${book.metadata.author || 'Unknown'}
Chapters: ${book.totalChapters}
Words: ~${book.totalWordCount.toLocaleString()}

${chapterData.length > 1 ? 'Chapter-by-chapter analysis:' : 'Full book content:'}

${input}

Extract the following as JSON (no markdown code fences, just raw JSON):

{
  "summary": "2-3 paragraph summary of the book's core message and value",
  "principles": [
    {
      "name": "Short principle name",
      "description": "1-2 sentence description",
      "sourceChapter": "Chapter name where this principle is most discussed",
      "actionable": true/false (can someone act on this directly?)
    }
  ],
  "frameworks": [
    {
      "name": "Framework/checklist name",
      "description": "What this framework helps with",
      "type": "checklist|process|matrix|spectrum",
      "steps": [
        { "label": "Step/item name", "description": "What to do/check" }
      ],
      "sourceChapter": "Chapter name"
    }
  ],
  "expertise": ["area1", "area2", ...],
  "tone": "Description of the author's writing style/tone in 1-2 sentences",
  "audienceLevel": "beginner|intermediate|advanced|expert",
  "primaryAction": "The main verb describing what this book helps readers DO (e.g., 'manage', 'build', 'evaluate', 'design')",
  "commandType": "audit|advisory|consult|generate - based on: audit if the book provides evaluation criteria/checklists; advisory if it's a how-to guide; consult if it's theoretical/conceptual; generate if it's about creating artifacts",
  "suggestedCommandName": "kebab-case command name derived from the book's primary action (e.g., 'audit-oss' for OSS management, 'design-api' for API design)"
}

Guidelines:
- Extract 8-20 principles (the core transferable ideas)
- Extract 2-8 frameworks (structured processes, checklists, or evaluation criteria)
- Frameworks should be specific enough to be actionable as tool steps
- For "checklist" type frameworks, steps are items to verify
- For "process" type frameworks, steps are sequential actions
- audienceLevel: who the book was written for
- Be faithful to the source — don't invent principles the author didn't articulate`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8000,
    messages: [{ role: 'user', content: prompt }],
  });

  const block = response.content[0];
  const text = block.type === 'text' ? block.text : '';

  // Parse JSON from response (handle potential markdown fences)
  const jsonStr = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

  try {
    const parsed = JSON.parse(jsonStr) as BookAnalysis;
    return parsed;
  } catch (err) {
    log.error(`Failed to parse analysis JSON: ${err instanceof Error ? err.message : err}`);
    log.info('Raw response (first 500 chars):');
    log.info(text.slice(0, 500));
    throw new Error('Claude returned invalid JSON for book analysis');
  }
}

function truncateToTokens(text: string, maxTokens: number): string {
  const tokens = encode(text);
  if (tokens.length <= maxTokens) return text;

  // Rough truncation: estimate chars per token (~4) and cut
  const ratio = maxTokens / tokens.length;
  const cutPoint = Math.floor(text.length * ratio);
  return text.slice(0, cutPoint) + '\n\n[... content truncated for analysis ...]';
}
