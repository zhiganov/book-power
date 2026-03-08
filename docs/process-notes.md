# Process Notes — book-power

## 2026-03-08 — Datalab API integration, CDH book conversion
- **Done:** Converted "Continuous Discovery Habits" PDF → markdown via Datalab API (401K chars). Updated CLAUDE.md and README with Datalab as alternative PDF extraction path. Created HAR-387 (hand-crafted MCP server for CDH).
- **Decisions:** Datalab API preferred over pdf-parse for complex PDFs (higher quality). Hand-crafted MCP path chosen over generic CLI pipeline for CDH book (like jtbd-knowledge).
- **State:** `books/continuous-discovery-habits.md` ready for hand-crafted MCP server work. API key stored as `DATALAB_API_KEY`.
- **Next:** Design CDH MCP server tools (HAR-387) — map to specific techniques from the book (OST, interview guides, assumption testing, etc.).

## 2026-03-08 — Document extraction upgrade plan
- **Done:** Compared 4 extraction tools. Wrote implementation plan for replacing pdf-parse with Kreuzberg + keeping Datalab API as opt-in.
- **Decisions:** Kreuzberg as default (MIT, Node.js native, 75+ formats including EPUB). Datalab API stays as `--datalab` flag for complex PDFs. pdf-parse to be removed.
- **State:** Plan saved at `docs/plans/2026-03-08-document-extraction-upgrade.md`. Not started.
- **Next:** Execute plan when prioritized (6 tasks, TDD).
