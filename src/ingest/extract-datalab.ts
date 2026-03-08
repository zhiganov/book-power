import type { Chapter } from '../types.js';
import { extractText } from './extract-text.js';
import { log } from '../logger.js';
import { writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const DATALAB_API_URL = 'https://www.datalab.to/api/v1/marker';

/**
 * Extract chapters from a PDF using the Datalab API (hosted Marker).
 * Higher quality than Kreuzberg for complex PDFs with tables/formulas.
 * Requires DATALAB_API_KEY environment variable.
 */
export async function extractDatalab(
  filePath: string,
  apiKey: string,
): Promise<{ chapters: Chapter[]; title: string; author: string }> {
  const { readFileSync } = await import('node:fs');
  const buffer = readFileSync(filePath);
  const filename = filePath.split(/[/\\]/).pop() || 'document.pdf';

  log.info(`Sending to Datalab API: ${filename}`);

  const formData = new FormData();
  formData.append('file', new Blob([buffer], { type: 'application/pdf' }), filename);
  formData.append('output_format', 'markdown');

  const response = await fetch(DATALAB_API_URL, {
    method: 'POST',
    headers: { 'X-Api-Key': apiKey },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Datalab API error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json() as { request_check_url?: string; markdown?: string };

  // Datalab API is async — poll for completion
  let markdown: string;
  if (result.request_check_url) {
    log.info('Waiting for Datalab processing...');
    markdown = await pollForResult(result.request_check_url, apiKey);
  } else {
    markdown = result.markdown || '';
  }

  log.info(`Datalab returned ${markdown.length} chars of markdown`);

  // Write to temp file and route through text extractor for markdown-aware splitting
  const tmpPath = join(tmpdir(), `datalab-${Date.now()}.md`);
  writeFileSync(tmpPath, markdown);
  try {
    return await extractText(tmpPath);
  } finally {
    unlinkSync(tmpPath);
  }
}

async function pollForResult(checkUrl: string, apiKey: string): Promise<string> {
  const maxAttempts = 60; // 5 minutes at 5s intervals
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 5000));

    const res = await fetch(checkUrl, {
      headers: { 'X-Api-Key': apiKey },
    });

    if (!res.ok) {
      throw new Error(`Datalab poll error: ${res.status}`);
    }

    const data = await res.json() as { status?: string; markdown?: string };
    if (data.status === 'complete' && data.markdown) {
      return data.markdown;
    }
    if (data.status === 'error') {
      throw new Error('Datalab API processing failed');
    }

    log.info(`  Still processing... (${i + 1}/${maxAttempts})`);
  }

  throw new Error('Datalab API timed out after 5 minutes');
}
