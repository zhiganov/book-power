import { extractFileSync } from '@kreuzberg/node';
import type { Chapter } from '../types.js';
import { log } from '../logger.js';

/**
 * Extract chapters from a file using Kreuzberg.
 * Supports PDF, EPUB, DOCX, PPTX, and 75+ other formats.
 */
export async function extractKreuzberg(
  filePath: string
): Promise<{ chapters: Chapter[]; title: string; author: string }> {

  log.info(`Extracting with Kreuzberg: ${filePath}`);
  const result = extractFileSync(filePath);

  const text = result.content || '';
  const metadata = (result.metadata || {}) as Record<string, unknown>;

  const title = (metadata.title as string) || '';
  const author = (metadata.author as string) || '';

  log.info(`Kreuzberg extracted ~${countWords(text)} words`);

  // Kreuzberg may output markdown (with # headings) even for PDFs
  const hasMarkdownHeadings = /^#{1,2}\s+/m.test(text);
  const chapters = hasMarkdownHeadings ? splitMarkdown(text) : splitByHeadings(text);

  return { chapters, title, author };
}

function splitMarkdown(text: string): Chapter[] {
  const lines = text.split('\n');
  const chapters: Chapter[] = [];
  let currentTitle = '';
  let currentContent: string[] = [];
  let order = 0;

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,2})\s+(.+)/);
    if (headingMatch) {
      if (currentContent.length > 0 || currentTitle) {
        pushChapter(chapters, currentTitle || 'Introduction', currentContent, order++);
      }
      currentTitle = headingMatch[2].trim();
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  pushChapter(chapters, currentTitle || 'Content', currentContent, order);
  return chapters;
}

function splitByHeadings(text: string): Chapter[] {
  const lines = text.split('\n');
  const chapters: Chapter[] = [];
  let currentTitle = 'Introduction';
  let currentContent: string[] = [];
  let order = 0;

  const chapterPattern = /^(?:chapter\s+\d+|part\s+\d+|\d+\.\s+|[A-Z][A-Z\s]{5,}$)/i;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    const prevBlank = i === 0 || lines[i - 1].trim() === '';

    if (
      trimmed.length > 0 &&
      trimmed.length < 80 &&
      prevBlank &&
      chapterPattern.test(trimmed) &&
      currentContent.length > 0
    ) {
      pushChapter(chapters, currentTitle, currentContent, order++);
      currentTitle = trimmed;
      currentContent = [];
    } else {
      currentContent.push(trimmed);
    }
  }

  pushChapter(chapters, currentTitle, currentContent, order);
  return chapters;
}

function pushChapter(
  chapters: Chapter[],
  title: string,
  lines: string[],
  order: number
): void {
  const content = lines.join('\n').trim();
  const wordCount = countWords(content);
  if (wordCount < 20) return;

  chapters.push({
    title,
    sections: [{ title, content, level: 1, wordCount }],
    wordCount,
    order,
  });
}

function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}
