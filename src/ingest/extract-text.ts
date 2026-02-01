import { readFileSync } from 'node:fs';
import type { Chapter, Section } from '../types.js';
import { log } from '../logger.js';

/**
 * Extract chapters from plain text or markdown files.
 * Uses heading heuristics to detect chapter boundaries.
 */
export async function extractText(
  filePath: string
): Promise<{ chapters: Chapter[]; title: string; author: string }> {
  log.info(`Reading text file: ${filePath}`);
  const text = readFileSync(filePath, 'utf-8');

  const isMarkdown = filePath.endsWith('.md');
  const chapters = isMarkdown ? splitMarkdown(text) : splitPlainText(text);

  // Infer title from first heading or filename
  const title = chapters[0]?.title || filePath.split(/[/\\]/).pop()?.replace(/\.\w+$/, '') || 'Untitled';

  return { chapters, title, author: '' };
}

function splitMarkdown(text: string): Chapter[] {
  const lines = text.split('\n');
  const chapters: Chapter[] = [];
  let currentTitle = '';
  let currentContent: string[] = [];
  let order = 0;

  for (const line of lines) {
    // Markdown headings: # or ##
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

function splitPlainText(text: string): Chapter[] {
  const lines = text.split('\n');
  const chapters: Chapter[] = [];
  let currentTitle = 'Introduction';
  let currentContent: string[] = [];
  let order = 0;

  // Heuristics for plain text chapter headings:
  // - ALL CAPS line preceded and followed by blank lines
  // - Lines starting with "Chapter N" or "PART N"
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const prevBlank = i === 0 || lines[i - 1].trim() === '';
    const nextBlank = i === lines.length - 1 || lines[i + 1]?.trim() === '';

    const isChapterHeading =
      line.length > 0 &&
      line.length < 80 &&
      prevBlank &&
      (/^(chapter|part)\s+\d+/i.test(line) ||
        (line === line.toUpperCase() && line.length > 3 && nextBlank));

    if (isChapterHeading && currentContent.length > 0) {
      pushChapter(chapters, currentTitle, currentContent, order++);
      currentTitle = line;
      currentContent = [];
    } else {
      currentContent.push(line);
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
