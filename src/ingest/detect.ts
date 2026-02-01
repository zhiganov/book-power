import { existsSync, statSync } from 'node:fs';
import type { SourceFormat, SourceLocation, BookSource } from '../types.js';

const FORMAT_BY_EXT: Record<string, SourceFormat> = {
  '.html': 'html',
  '.htm': 'html',
  '.xhtml': 'html',
  '.pdf': 'pdf',
  '.txt': 'text',
  '.md': 'text',
  '.epub': 'epub',
};

const FORMAT_BY_CONTENT_TYPE: Record<string, SourceFormat> = {
  'text/html': 'html',
  'application/xhtml+xml': 'html',
  'application/pdf': 'pdf',
  'text/plain': 'text',
  'application/epub+zip': 'epub',
};

function isUrl(input: string): boolean {
  return /^https?:\/\//i.test(input);
}

function getExtension(path: string): string {
  const match = path.match(/(\.[a-z0-9]+)(?:\?|#|$)/i);
  return match ? match[1].toLowerCase() : '';
}

function detectFormatFromPath(path: string): SourceFormat {
  const ext = getExtension(path);
  return FORMAT_BY_EXT[ext] ?? 'html';
}

export function detectFormatFromContentType(contentType: string): SourceFormat {
  const base = contentType.split(';')[0].trim().toLowerCase();
  return FORMAT_BY_CONTENT_TYPE[base] ?? 'html';
}

export async function detectSource(input: string): Promise<BookSource> {
  if (isUrl(input)) {
    // For URLs, do a HEAD request to sniff content type
    const format = await sniffUrlFormat(input);
    return {
      input,
      location: 'url',
      format,
      localPaths: [],
    };
  }

  if (!existsSync(input)) {
    throw new Error(`Path does not exist: ${input}`);
  }

  const stat = statSync(input);

  if (stat.isDirectory()) {
    return {
      input,
      location: 'directory',
      format: 'html', // directories assumed to contain HTML chapters
      localPaths: [input],
    };
  }

  return {
    input,
    location: 'file',
    format: detectFormatFromPath(input),
    localPaths: [input],
  };
}

async function sniffUrlFormat(url: string): Promise<SourceFormat> {
  // First try extension
  const extFormat = FORMAT_BY_EXT[getExtension(url)];
  if (extFormat) return extFormat;

  // HEAD request to check content-type
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    const ct = res.headers.get('content-type') ?? '';
    return detectFormatFromContentType(ct);
  } catch {
    // Default to HTML for URLs
    return 'html';
  }
}
