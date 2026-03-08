# Document Extraction Upgrade — book-power

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace `pdf-parse` with Kreuzberg as the default extractor, keep Datalab API as a high-quality option, and add EPUB support.

**Architecture:** Kreuzberg (`@kreuzberg/node`) becomes the primary extraction backend — it handles PDF, EPUB, DOCX, and 75+ formats natively from TypeScript. Datalab API (Marker's hosted version) remains as an opt-in high-quality mode for complex PDFs with tables/formulas. The extraction layer becomes pluggable: Kreuzberg (default) → Datalab API (opt-in via flag) → pdf-parse (removed).

**Tech Stack:** `@kreuzberg/node` (MIT, Rust core), Datalab API (external), TypeScript

---

## Current State

| Component | Tool | Limitation |
|-----------|------|-----------|
| PDF extraction | `pdf-parse` (npm) | Basic text only, no layout/tables, poor chapter detection |
| High-quality PDF | Datalab API (external) | Requires API key, network, costs money |
| EPUB | Not supported (throws) | Users told to convert manually |
| DOCX/PPTX | Not supported | — |

## Target State

| Component | Tool | Benefit |
|-----------|------|--------|
| Default extraction | Kreuzberg (`@kreuzberg/node`) | 75+ formats, tables, OCR, MIT, offline, fast |
| High-quality PDF | Datalab API (opt-in) | Best quality for complex academic/financial PDFs |
| EPUB | Kreuzberg (native) | No conversion needed |
| DOCX/PPTX | Kreuzberg (native) | New formats unlocked |

## Comparison: Kreuzberg vs Datalab API vs pdf-parse

| | pdf-parse (current) | Kreuzberg (new default) | Datalab API (opt-in) |
|---|---|---|---|
| Quality | Basic text dump | Good — tables, OCR, metadata | Best — layout-aware, formulas |
| Speed | Fast | Fast (Rust core) | Slow (network + processing) |
| Cost | Free | Free | Paid API |
| Offline | Yes | Yes | No |
| Formats | PDF only | 75+ (PDF, EPUB, DOCX, images...) | PDF only |
| License | MIT | MIT | Commercial |
| Node.js | Yes | Yes (`@kreuzberg/node`) | HTTP API |
| Tables | No | Yes | Yes |
| OCR | No | Yes (Tesseract, PaddleOCR) | Yes |

## Relationship: Datalab API ↔ Marker

Marker is Datalab's open-source project (GPL code + restricted model weights). The Datalab API is their hosted commercial version — same tech, better quality (proprietary models), no self-hosting hassle. We keep the API as an option because:
- Best quality for complex PDFs (academic papers, financial docs, heavy tables)
- Already integrated (books/continuous-discovery-habits.md was converted via Datalab)
- Worth the cost for books where extraction quality matters

---

### Task 1: Add Kreuzberg dependency

**Files:**
- Modify: `package.json`

**Step 1: Install Kreuzberg**

```bash
npm install @kreuzberg/node
```

**Step 2: Verify installation**

```bash
node -e "const k = require('@kreuzberg/node'); console.log('Kreuzberg loaded:', typeof k)"
```

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add @kreuzberg/node for document extraction"
```

---

### Task 2: Create Kreuzberg extractor

**Files:**
- Create: `src/ingest/extract-kreuzberg.ts`
- Test: `src/ingest/__tests__/extract-kreuzberg.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { extractWithKreuzberg } from '../extract-kreuzberg.js';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('extractWithKreuzberg', () => {
  it('extracts text from a PDF file', async () => {
    // Use any small test PDF — create a fixture or use an existing book
    const buffer = readFileSync(join(__dirname, '../../../fixtures/test.pdf'));
    const result = await extractWithKreuzberg(buffer, 'test.pdf');
    expect(result.chapters.length).toBeGreaterThan(0);
    expect(result.totalWordCount).toBeGreaterThan(0);
  });

  it('extracts text from a text file', async () => {
    const buffer = Buffer.from('# Chapter 1\n\nSome content.\n\n# Chapter 2\n\nMore content.');
    const result = await extractWithKreuzberg(buffer, 'test.md');
    expect(result.chapters.length).toBe(2);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/ingest/__tests__/extract-kreuzberg.test.ts
```

**Step 3: Write implementation**

```typescript
// src/ingest/extract-kreuzberg.ts
import type { BookContent, Chapter } from '../types.js';

export async function extractWithKreuzberg(
  buffer: Buffer,
  filename: string
): Promise<BookContent> {
  // Dynamic import — @kreuzberg/node is CommonJS
  const kreuzberg = await import('@kreuzberg/node');

  const result = await kreuzberg.extractFromBuffer(buffer, {
    filename,
    extractTables: true,
    extractMetadata: true,
  });

  const text = result.text || '';
  const metadata = result.metadata || {};

  // Split into chapters using heading detection
  const chapters = splitIntoChapters(text);

  const totalWordCount = chapters.reduce((sum, ch) => sum + ch.wordCount, 0);

  return {
    metadata: {
      title: metadata.title || filename.replace(/\.[^.]+$/, ''),
      author: metadata.author || 'Unknown',
      description: '',
    },
    chapters,
    totalWordCount,
    totalChapters: chapters.length,
  };
}

function splitIntoChapters(text: string): Chapter[] {
  // Reuse existing heading heuristics from extract-pdf.ts
  const chapterPattern = /^(?:chapter\s+\d+|part\s+\d+|\d+\.\s+|[A-Z][A-Z\s]{5,}$)/im;
  const lines = text.split('\n');
  const chapters: Chapter[] = [];
  let currentTitle = 'Introduction';
  let currentContent: string[] = [];
  let order = 0;

  for (const line of lines) {
    if (chapterPattern.test(line.trim()) && currentContent.length > 0) {
      chapters.push(makeChapter(currentTitle, currentContent.join('\n'), order++));
      currentTitle = line.trim();
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  if (currentContent.length > 0) {
    chapters.push(makeChapter(currentTitle, currentContent.join('\n'), order));
  }

  return chapters.length > 0 ? chapters : [makeChapter('Full Text', text, 0)];
}

function makeChapter(title: string, content: string, order: number): Chapter {
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  return {
    title,
    sections: [{ title, content, level: 1, wordCount }],
    wordCount,
    order,
  };
}
```

**Step 4: Run tests**

```bash
npx vitest run src/ingest/__tests__/extract-kreuzberg.test.ts
```

**Step 5: Commit**

```bash
git add src/ingest/extract-kreuzberg.ts src/ingest/__tests__/
git commit -m "feat: add Kreuzberg extractor for PDF, EPUB, DOCX support"
```

---

### Task 3: Integrate Kreuzberg into structure.ts router

**Files:**
- Modify: `src/ingest/structure.ts`
- Modify: `src/types.ts` (add new formats)

**Step 1: Add new source formats**

In `src/types.ts`, extend:
```typescript
type SourceFormat = 'html' | 'pdf' | 'text' | 'epub' | 'docx' | 'pptx';
```

**Step 2: Update detect.ts extension map**

Add `.docx`, `.pptx`, `.xlsx` mappings.

**Step 3: Update structure.ts routing**

Replace the `pdf` case and `epub` error with Kreuzberg:
```typescript
case 'pdf': {
  // Kreuzberg replaces pdf-parse as default
  const buffer = readFileSync(source.localPaths[0]);
  return extractWithKreuzberg(buffer, basename(source.localPaths[0]));
}
case 'epub':
case 'docx':
case 'pptx': {
  const buffer = readFileSync(source.localPaths[0]);
  return extractWithKreuzberg(buffer, basename(source.localPaths[0]));
}
```

**Step 4: Run all tests**

```bash
npx vitest run
```

**Step 5: Commit**

```bash
git add src/ingest/structure.ts src/ingest/detect.ts src/types.ts
git commit -m "feat: route PDF/EPUB/DOCX through Kreuzberg extractor"
```

---

### Task 4: Add Datalab API as opt-in flag

**Files:**
- Create: `src/ingest/extract-datalab.ts`
- Modify: `src/cli.ts` (add `--datalab` flag)

**Step 1: Create Datalab extractor**

Wraps the existing Datalab API workflow (PDF → markdown → text extraction) into a function:

```typescript
// src/ingest/extract-datalab.ts
import type { BookContent } from '../types.js';

const DATALAB_API_URL = 'https://api.datalab.to/api/v1/marker';

export async function extractWithDatalab(
  buffer: Buffer,
  filename: string,
  apiKey: string,
): Promise<BookContent> {
  const formData = new FormData();
  formData.append('file', new Blob([buffer]), filename);
  formData.append('output_format', 'markdown');

  const response = await fetch(DATALAB_API_URL, {
    method: 'POST',
    headers: { 'X-Api-Key': apiKey },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Datalab API error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  const markdown = result.markdown || result.text || '';

  // Route through text extractor for markdown-aware chapter splitting
  const { extractText } = await import('./extract-text.js');
  return extractText(markdown, filename);
}
```

**Step 2: Add CLI flag**

In `src/cli.ts`, add `--datalab` flag that:
- Requires `DATALAB_API_KEY` env var
- Routes PDF through `extractWithDatalab` instead of Kreuzberg
- Only applies to PDF (EPUB/DOCX always use Kreuzberg)

**Step 3: Commit**

```bash
git add src/ingest/extract-datalab.ts src/cli.ts
git commit -m "feat: add --datalab flag for high-quality PDF extraction via Datalab API"
```

---

### Task 5: Remove pdf-parse dependency

**Files:**
- Delete: `src/ingest/extract-pdf.ts`
- Delete: `src/pdf-parse.d.ts`
- Modify: `package.json` (remove `pdf-parse`)

**Step 1: Remove files and dependency**

```bash
rm src/ingest/extract-pdf.ts src/pdf-parse.d.ts
npm uninstall pdf-parse
```

**Step 2: Run all tests to verify nothing breaks**

```bash
npx vitest run
```

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove pdf-parse, replaced by Kreuzberg"
```

---

### Task 6: Update CLAUDE.md and docs

**Files:**
- Modify: `CLAUDE.md`

Update the ingest stage docs to reflect:
- Kreuzberg is the default extractor for PDF, EPUB, DOCX, PPTX
- Datalab API is opt-in via `--datalab` flag + `DATALAB_API_KEY`
- pdf-parse is removed
- EPUB is now supported

**Commit:**

```bash
git add CLAUDE.md
git commit -m "docs: update extraction pipeline docs for Kreuzberg + Datalab"
```
