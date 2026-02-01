import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { log } from '../logger.js';

const FETCH_TIMEOUT = 30_000;
const MAX_REDIRECTS = 5;

export async function fetchUrl(url: string): Promise<string> {
  log.info(`Fetching ${url}`);
  const res = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(FETCH_TIMEOUT),
    headers: {
      'User-Agent': 'book-power/0.1 (https://github.com/zhiganov/book-power)',
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}`);
  }

  return res.text();
}

export async function fetchToFile(url: string, ext: string = '.html'): Promise<string> {
  const content = await fetchUrl(url);
  const dir = join(tmpdir(), 'book-power');
  mkdirSync(dir, { recursive: true });
  const filename = `${randomBytes(8).toString('hex')}${ext}`;
  const filepath = join(dir, filename);
  writeFileSync(filepath, content, 'utf-8');
  log.info(`Saved to ${filepath}`);
  return filepath;
}

export async function fetchMultiple(urls: string[]): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  // Fetch in batches of 5 to be polite
  const batchSize = 5;
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    const responses = await Promise.all(
      batch.map(async (url) => {
        try {
          const html = await fetchUrl(url);
          return { url, html };
        } catch (err) {
          log.warn(`Failed to fetch ${url}: ${err instanceof Error ? err.message : err}`);
          return { url, html: '' };
        }
      })
    );
    for (const { url, html } of responses) {
      if (html) results.set(url, html);
    }
  }
  return results;
}
