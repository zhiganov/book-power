# Book Power

Turn books into interactive tools — MCP servers, conversation templates, slash commands, or knowledge avatars.

## The idea

Methodology books are full of frameworks, workflows, and interview techniques — but applying them in practice is hard. Book Power bridges that gap: extract a book's methodology and turn it into tools you can actually use while doing the work.

## What it does today

### CLI pipeline

```
Book (URL / PDF / TXT) → Extract → Analyze → Generate
```

1. **Ingest** — Extracts content from URLs, files, or directories (HTML, PDF, plain text). For PDFs, supports both local `pdf-parse` extraction and [Datalab API](https://www.datalab.to/) pre-conversion to markdown (higher quality, handles complex layouts)
2. **Analyze** — Uses Claude to extract principles, frameworks, expertise areas, and tone
3. **Generate** — Produces one of three output formats:
   - **`mcp`** — MCP server with embedded book content and tools for search, reference, guided analysis
   - **`command`** — Claude Code slash command for interactive audits and assessments
   - **`avatar`** — Knowledge avatar config for [avatar-sdk](https://github.com/harmonicabot/avatar-sdk) (infuse book wisdom into group discussions)

### Interactive mode

```
/book-power
```

Claude Code slash command — no API key needed (Claude Code handles analysis).

## Built with book-power

| Project | Format | Source | Status |
|---------|--------|--------|--------|
| **[claude-audit-oss](https://github.com/zhiganov/claude-audit-oss)** | Slash command | [Producing Open Source Software](https://producingoss.com/) by Karl Fogel (CC BY-SA 4.0) | Published |
| **jtbd-knowledge** | MCP server | Bob Moesta's "Demand-Side Sales 101" + Jim Kalbach's "The JTBD Playbook" | Private |

### jtbd-knowledge MCP server

The first hand-crafted MCP server — goes beyond the generic generator with purpose-built tools for applying JTBD methodology in practice.

**13 tools in 3 groups:**

- **Reference (6):** `search_content`, `get_framework`, `get_workflow`, `get_recipe`, `get_interview_questions`, `list_all`
- **Guided analysis (4):** `get_analysis_template`, `get_output_format`, `format_action_items`, `suggest_next_step`
- **Navigation (3):** `get_technique`, `compare_books`, `get_quote`

**Content:** 23 frameworks, 17 workflows, 5 recipes, 40 interview questions, 12 interview techniques, 13 templates, 6 analysis templates, 39 concepts, 28 quotes — from two books combined.

**Key innovation:** `suggest_next_step` — a recipe-based workflow navigator. Given where you are in the JTBD process and your goal, it recommends which framework to apply next, based on Kalbach's 5 recipes (Launch New Product, Optimize Existing, Increase Demand, Customer Success, Innovation Strategy).

**Architecture:** Hybrid approach — structured reference data + analysis templates that Claude fills in from real data (transcripts, surveys). No LLM calls in the server. The server provides methodology scaffolding; Claude in conversation does the analytical work.

## Usage

```bash
# CLI (requires ANTHROPIC_API_KEY)
book-power process <source> --output mcp|command|avatar

# Examples
book-power process https://producingoss.com/en/producingoss.html --output command
book-power process ./my-book.pdf --output mcp
book-power process ./book-chapters/ --output avatar
```

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

## Vision

### Book → facilitated sessions

The biggest opportunity: translate any methodology book into structured facilitation sessions on [Harmonica](https://harmonica.chat). A consultant uploads a change management book → gets a ready-to-use workshop template chain. JTBD interview → Four Forces analysis → ODI scoring → strategy session — all as guided, AI-facilitated conversations.

### For publishers

Authors and publishers could offer interactive companion tools alongside their books — "buy the book, get the tools." MCP servers for AI-assisted methodology application, or Harmonica session templates for facilitated workshops.

### For facilitators and consultants

Upload any methodology book you own and generate custom session templates. The platform provides transformation infrastructure, you supply your licensed content. IP responsibility stays with you (same model as YouTube/Dropbox).

### Planned MCP servers

- **Continuous Discovery Habits** — Teresa Torres's product discovery methodology (hand-crafted, HAR-387). Source markdown already converted via Datalab API.
- **Producing OSS** — Rebuild audit-oss as MCP server with learnings from jtbd-knowledge
- **Governable Spaces** — Nathan Schneider's book on governance, for gov/acc research collaboration with Metagov

## License

MIT
