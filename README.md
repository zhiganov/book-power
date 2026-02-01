# book-power

Turn books (with appropriate copyright) into conversational avatars, slash commands, or MCP servers.

## How it works

1. **Ingest** — Fetches and extracts book content from URLs, files, or directories (HTML, PDF, plain text)
2. **Analyze** — Uses Claude to extract principles, frameworks, expertise areas, and tone
3. **Generate** — Produces one of three output formats

## Output formats

| Format | Description | Use case |
|--------|-------------|----------|
| `avatar` | avatar-sdk compatible config.json + sources.json | Knowledge avatars for group discussions |
| `command` | Publishable Claude Code slash command | Interactive audits, assessments, consultations |
| `mcp` | Standalone MCP server project | Tool-based access from any MCP client |

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
