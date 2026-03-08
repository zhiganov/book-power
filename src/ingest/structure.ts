import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { BookSource, BookContent, Chapter } from '../types.js';
import { extractHtml } from './extract-html.js';
import { extractKreuzberg } from './extract-kreuzberg.js';
import { extractText } from './extract-text.js';
import { fetchUrl } from './fetch.js';
import { log } from '../logger.js';

export interface ExtractionOptions {
  /** Use Datalab API for high-quality PDF extraction */
  useDatalab?: boolean;
}

/**
 * Normalize any source format into a unified BookContent structure.
 */
export async function extractBookContent(source: BookSource, options: ExtractionOptions = {}): Promise<BookContent> {
  let chapters: Chapter[];
  let title: string;
  let author: string;

  switch (source.format) {
    case 'html': {
      if (source.location === 'url') {
        const html = await fetchUrl(source.input);
        ({ chapters, title, author } = await extractHtml(html, source.input));
      } else if (source.location === 'directory') {
        ({ chapters, title, author } = await extractHtmlDirectory(source.localPaths[0]));
      } else {
        const html = readFileSync(source.localPaths[0], 'utf-8');
        ({ chapters, title, author } = await extractHtml(html));
      }
      break;
    }
    case 'pdf': {
      if (options.useDatalab) {
        const apiKey = process.env.DATALAB_API_KEY;
        if (!apiKey) {
          throw new Error('DATALAB_API_KEY environment variable is required for --datalab mode');
        }
        const { extractDatalab } = await import('./extract-datalab.js');
        ({ chapters, title, author } = await extractDatalab(source.localPaths[0], apiKey));
      } else {
        ({ chapters, title, author } = await extractKreuzberg(source.localPaths[0]));
      }
      break;
    }
    case 'text': {
      ({ chapters, title, author } = await extractText(source.localPaths[0]));
      break;
    }
    case 'epub':
    case 'docx':
    case 'pptx': {
      ({ chapters, title, author } = await extractKreuzberg(source.localPaths[0]));
      break;
    }
    default:
      throw new Error(`Unsupported format: ${source.format}`);
  }

  const totalWordCount = chapters.reduce((sum, ch) => sum + ch.wordCount, 0);

  log.success(`Extracted ${chapters.length} chapters, ${totalWordCount.toLocaleString()} words`);

  return {
    metadata: {
      title,
      author,
      url: source.location === 'url' ? source.input : undefined,
    },
    chapters,
    totalWordCount,
    totalChapters: chapters.length,
  };
}

async function extractHtmlDirectory(
  dirPath: string
): Promise<{ chapters: Chapter[]; title: string; author: string }> {
  const files = readdirSync(dirPath)
    .filter((f) => /\.html?$/i.test(f))
    .sort();

  log.info(`Found ${files.length} HTML files in directory`);

  const chapters: Chapter[] = [];
  let title = '';
  let author = '';

  for (let i = 0; i < files.length; i++) {
    const filePath = join(dirPath, files[i]);
    const html = readFileSync(filePath, 'utf-8');
    const result = await extractHtml(html);

    if (i === 0) {
      title = result.title;
      author = result.author;
    }

    for (const ch of result.chapters) {
      ch.order = chapters.length;
      chapters.push(ch);
    }
  }

  return { chapters, title: title || 'Untitled', author };
}
