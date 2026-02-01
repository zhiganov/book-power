import { readFileSync } from 'node:fs';
import type { Chapter, Section } from '../types.js';
import { log } from '../logger.js';

/**
 * Extract chapters from a PDF file.
 * Uses pdf-parse for text extraction, then splits by heading heuristics.
 */
export async function extractPdf(
  filePath: string
): Promise<{ chapters: Chapter[]; title: string; author: string }> {
  // Dynamic import since pdf-parse uses CJS
  const pdfParse = (await import('pdf-parse')).default;

  log.info(`Parsing PDF: ${filePath}`);
  const buffer = readFileSync(filePath);
  const data = await pdfParse(buffer);

  const title = data.info?.Title || 'Untitled';
  const author = data.info?.Author || '';
  const text = data.text;

  log.info(`PDF: ${data.numpages} pages, ~${countWords(text)} words`);

  // Split text into chapters by detecting heading-like lines
  const chapters = splitIntoChapters(text);

  return { chapters, title, author };
}

function splitIntoChapters(text: string): Chapter[] {
  const lines = text.split('\n');
  const chapters: Chapter[] = [];
  let currentTitle = 'Introduction';
  let currentContent: string[] = [];
  let order = 0;

  // Heuristic: chapter headings are short lines (< 80 chars) preceded by blank lines
  // and often start with "Chapter", a number, or are ALL CAPS
  const chapterPattern = /^(?:chapter\s+\d+|part\s+\d+|\d+\.\s+|[A-Z][A-Z\s]{5,}$)/i;

  for (const line of lines) {
    const trimmed = line.trim();

    if (
      trimmed.length > 0 &&
      trimmed.length < 80 &&
      chapterPattern.test(trimmed) &&
      currentContent.length > 0
    ) {
      // Save previous chapter
      const content = currentContent.join('\n').trim();
      const wordCount = countWords(content);
      if (wordCount > 50) {
        chapters.push({
          title: currentTitle,
          sections: [{ title: currentTitle, content, level: 1, wordCount }],
          wordCount,
          order: order++,
        });
      }
      currentTitle = trimmed;
      currentContent = [];
    } else {
      currentContent.push(trimmed);
    }
  }

  // Don't forget last chapter
  const content = currentContent.join('\n').trim();
  const wordCount = countWords(content);
  if (wordCount > 50) {
    chapters.push({
      title: currentTitle,
      sections: [{ title: currentTitle, content, level: 1, wordCount }],
      wordCount,
      order: order++,
    });
  }

  return chapters;
}

function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}
