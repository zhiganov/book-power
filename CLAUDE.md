# CLAUDE.md

## Project Overview

**book-power** — CLI tool that turns books (with appropriate copyright) into conversational avatars, slash commands, or MCP servers. Takes a book URL/file, extracts content, analyzes it with Claude, and generates output artifacts.

## Commands

```bash
npm run build          # Compile TypeScript
npm run dev            # Run CLI via tsx (development)
npm run typecheck      # Type-check without emitting

# CLI usage
npx tsx src/cli.ts process <source> --output avatar|command|mcp
```

## Code Style

- TypeScript strict mode, ESM (`"type": "module"`)
- No explicit `any` — use typed interfaces
- Manual argument parsing (no yargs/commander)

## Architecture

Pipeline: **Ingest → Analyze → Generate**

- **`src/ingest/`** — Format detection, fetching, content extraction (HTML/PDF/text), normalization to `BookContent`
- **`src/analyze/`** — Claude-powered analysis (principles, frameworks, tone) + copyright detection
- **`src/generators/`** — Output generators (avatar config, slash command, MCP server)
- **`templates/`** — Template files for each output type
- **`slash-command/`** — `/book-power` command for interactive Claude Code use

## Key Types

- `BookSource` — input specification (URL, file, or directory)
- `BookContent` — normalized book structure (chapters, sections, metadata)
- `BookAnalysis` — Claude's analysis output (principles, frameworks, expertise, tone)

## Output Formats

1. **Avatar** — generates `config.json` + `sources.json` compatible with avatar-sdk
2. **Command** — generates a publishable slash command repo (like claude-audit-oss)
3. **MCP Server** — generates a standalone MCP server project with embedded book data

## Environment Variables

- `ANTHROPIC_API_KEY` — required for CLI analysis step (not needed for slash command)

## First Test Case

Producing Open Source Software by Karl Fogel (CC BY-SA 4.0) at producingoss.com
