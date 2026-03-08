# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**book-power** — Turn books into interactive tools: MCP servers, slash commands, knowledge avatars, or Harmonica session templates. Takes a book (URL/file/directory), extracts content, analyzes it with Claude, and generates output artifacts.

The generic CLI pipeline generates basic 5-tool MCP servers from auto-analyzed content. For richer outputs (specialized tools, multi-book synthesis, guided analysis templates), hand-craft the MCP server using the analysis files as source data — see jtbd-knowledge as the reference implementation.

## Commands

```bash
npm run build          # Compile TypeScript
npm run typecheck      # Type-check without emitting

# CLI (requires ANTHROPIC_API_KEY)
npx tsx src/cli.ts process <source> --output avatar|command|mcp [--output-dir <dir>] [--skip-copyright]

# Interactive (no API key needed)
# /book-power slash command in Claude Code
```

## Code Style

- TypeScript strict mode, ESM (`"type": "module"`)
- No explicit `any` — use typed interfaces (`src/pdf-parse.d.ts` for untyped deps)
- Manual argument parsing (no yargs/commander)

## Architecture

**Pipeline: Ingest → Analyze → Generate**

```
Input (URL/file/directory)
  → detect.ts       → BookSource    (format + location detection)
  → structure.ts    → BookContent   (normalized chapters/sections)
  → copyright.ts    → CopyrightInfo (license gate — halts if no derivatives allowed)
  → analyze.ts      → BookAnalysis  (Claude-powered: principles, frameworks, tone)
  → generators/*.ts → GeneratorOutput (files written to disk)
```

All types in `src/types.ts`. The pipeline is orchestrated by `src/cli.ts` (batch) or `slash-command/book-power.md` (interactive, no API key needed).

### Ingest stage

`structure.ts` routes by format to the appropriate extractor:

- **HTML** (`extract-html.ts`): Detects multi-page books by scanning for TOC links (tries `.toc a`, `nav a`, etc. — stops after ≥3 links found). Multi-page fetches chapters in batches of 5. Single-page splits by h1/h2 headings. Strips nav/header/footer/scripts before extraction.
- **PDF** (`extract-pdf.ts`): Uses `pdf-parse`, splits by chapter heading heuristics (lines matching `/^chapter\s+\d+/i` or ALL CAPS).
- **PDF via Datalab API** (`books/` pre-conversion): For higher-quality PDF extraction, use Datalab API to convert PDF → markdown before ingestion. Already converted: `continuous-discovery-habits.md`. The markdown file can then be processed by `extract-text.ts` (markdown-aware heading detection). Datalab API details in MEMORY.md "Tools in the Workspace".
- **Text** (`extract-text.ts`): Markdown-aware (`#` headings) or plain text heuristics.
- **EPUB**: Not yet supported (throws).

### Analysis stage

`analyze.ts` handles large books by chunking: if total tokens > 40k, processes chapter-by-chapter (each truncated to 8k tokens), then synthesizes. Small books go through in one pass. Output is structured JSON parsed from Claude's response (strips markdown fences if present).

`copyright.ts` detects licenses in three tiers: CC URL regex (most reliable, `verified: true`), text pattern matching (13 patterns, most-specific-first), fallback to `unknown` with `allowsDerivatives: false` (safe default).

### Generators

**`command.ts`** — Generates all files programmatically (string arrays, not templates). Produces a 6-file slash command repo: command `.md`, reference data `.md`, install.sh, install.ps1, README, LICENSE. The command `.md` follows the audit-oss 6-step pattern (parse → load → examine → score → save → next steps).

**`mcp-server.ts`** — Reads `templates/mcp-server/package.template.json` and `tsconfig.template.json` (the only generator that uses templates). Generates `src/data.ts` with embedded book content as TypeScript constants and `src/index.ts` with 5 MCP tools (search uses substring matching, not vector search). This is the generic generator — for specialized MCP servers, see the hand-crafted approach below.

**`avatar.ts`** — Generates config.json + corpus/sources.json compatible with [avatar-sdk](https://github.com/harmonicabot/avatar-sdk). Uses "student framing" in systemPrompt (not impersonation). Unlike MCP output, avatars require the avatar-sdk processor pipeline after generation (download → chunk → embed → pgvector).

### Templates

Only `templates/mcp-server/` files are read by generators. The `templates/command/` and `templates/avatar/` files are reference documentation — the actual generators build content programmatically.

## Hand-crafted MCP servers

The generic `mcp-server.ts` generator produces basic 5-tool servers. For specialized use cases, hand-craft the server instead:

1. Create book analysis files in `books/analysis-{author}-{title}.md` (structured extraction of frameworks, workflows, templates, quotes)
2. Design purpose-built tools (guided analysis templates, recipe navigation, cross-book comparison)
3. Build the server in `book-power-output/mcp/{name}/` using `@modelcontextprotocol/sdk`

**Reference implementation:** `book-power-output/mcp/jtbd-knowledge/` — 13-tool JTBD server combining two books with guided analysis templates and recipe-based workflow navigation. Has its own CLAUDE.md. Design doc at `docs/plans/2026-03-07-jtbd-mcp-server-design.md`.

## Private content (gitignored)

- `books/` — Source book TXT files and analysis markdown files (copyrighted content)
- `book-power-output/` — Generated MCP servers with embedded book content

## Design docs

`docs/plans/` contains design documents and implementation plans:
- `2026-03-07-jtbd-mcp-server-design.md` — Design doc for jtbd-knowledge (approach selection, tool design, data model)
- `2026-03-07-jtbd-mcp-server-impl.md` — Implementation plan (11 tasks, TDD)
- `2026-03-07-commercialization-notes.md` — Early commercialization thinking (open-core, revenue angles, publisher partnerships)

## Environment Variables

- `ANTHROPIC_API_KEY` — required for CLI analysis step (not needed for slash command)
