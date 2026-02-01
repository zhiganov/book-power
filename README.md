# Book Power

Turn books (with appropriate copyright) into conversational avatars, slash commands, or MCP servers.

## How it works

1. **Ingest** — Fetches and extracts book content from URLs, files, or directories (HTML, PDF, plain text)
2. **Analyze** — Uses Claude to extract principles, frameworks, expertise areas, and tone
3. **Generate** — Produces one of three output formats

## Output formats

### `command` — Slash command

Generates a publishable [Claude Code](https://docs.anthropic.com/en/docs/claude-code) slash command repo (like [claude-audit-oss](https://github.com/zhiganov/claude-audit-oss)). The command `.md` file instructs Claude Code directly — no API key or runtime needed. Includes install scripts, reference data, and README. Best for interactive audits, assessments, and consultations.

### `mcp` — MCP server

Generates a standalone [Model Context Protocol](https://modelcontextprotocol.io/) server project. Book content is embedded as TypeScript constants with tools for searching, browsing chapters, and retrieving principles/frameworks. Uses simple string matching (no vector DB) — the server is self-contained and works with any MCP client. Built on `@modelcontextprotocol/sdk` with stdio transport.

### `avatar` — Knowledge avatar

Generates config compatible with [avatar-sdk](https://github.com/harmonicabot/avatar-sdk) (Conversational Avatar Protocol). This is the most involved output: produces `config.json` (persona, systemPrompt, vectorStore settings) and `corpus/sources.json` (source metadata). Unlike the other formats, avatars require a vector search pipeline — after generation you need to run the avatar-sdk processor to download sources, chunk text, generate embeddings (OpenAI), and store them in Supabase pgvector. The avatar then participates in group conversations via MCP with retrieval-augmented responses grounded in the source material.

## Usage

### CLI

```bash
# Requires ANTHROPIC_API_KEY
book-power process <source> --output avatar|command|mcp

# Examples
book-power process https://producingoss.com/en/producingoss.html --output command
book-power process ./my-book.pdf --output avatar
book-power process ./book-chapters/ --output mcp
```

### Slash command

```
/book-power
```

Interactive flow in Claude Code — no API key needed (Claude Code handles the analysis).

## Installation

```bash
npm install
npm run build
```

### Slash command only

**macOS/Linux:**
```bash
curl -fsSL https://raw.githubusercontent.com/zhiganov/book-power/main/slash-command/install.sh | bash
```

**Windows (PowerShell):**
```powershell
irm https://raw.githubusercontent.com/zhiganov/book-power/main/slash-command/install.ps1 | iex
```

## First test case

[Producing Open Source Software](https://producingoss.com/) by Karl Fogel (CC BY-SA 4.0)

## License

MIT
