# Process Notes — book-power

## 2026-03-08 — Datalab API integration, CDH book conversion
- **Done:** Converted "Continuous Discovery Habits" PDF → markdown via Datalab API (401K chars). Updated CLAUDE.md and README with Datalab as alternative PDF extraction path. Created HAR-387 (hand-crafted MCP server for CDH).
- **Decisions:** Datalab API preferred over pdf-parse for complex PDFs (higher quality). Hand-crafted MCP path chosen over generic CLI pipeline for CDH book (like jtbd-knowledge).
- **State:** `books/continuous-discovery-habits.md` ready for hand-crafted MCP server work. API key stored as `DATALAB_API_KEY`.
- **Next:** Design CDH MCP server tools (HAR-387) — map to specific techniques from the book (OST, interview guides, assumption testing, etc.).

## 2026-03-08 — Kreuzberg integration + Facilitating Deliberation MCP
- **Done:**
  - Implemented Kreuzberg extraction upgrade (6 tasks, all complete on `feat/kreuzberg-extraction` branch, 9 commits)
  - Kreuzberg is default for EPUB/DOCX/PPTX; Datalab is auto-default for PDFs when `DATALAB_API_KEY` is set (much higher quality). `--no-datalab` flag to force Kreuzberg for PDFs.
  - Added `dotenv/config` to CLI for `.env` file loading. `DATALAB_API_KEY` stored in `book-power/.env`.
  - Extracted "Facilitating Deliberation" book via Datalab (837K chars, 59 chapters, 92K words). Saved to `books/facilitating-deliberation.md`.
  - Designed 12-tool MCP server (Practitioner Toolkit approach). Design doc: `docs/plans/2026-03-08-facilitating-deliberation-mcp-design.md`.
  - Wrote 11-task implementation plan: `docs/plans/2026-03-08-facilitating-deliberation-mcp-impl.md`.
- **Decisions:**
  - Datalab default for PDFs (5 chapters vs 59 — massive quality difference in structure).
  - Two audiences: facilitators planning deliberations + AI agent developers (e.g., Habermolt).
  - Hand-crafted MCP (not generic pipeline) — follows jtbd-knowledge pattern.
  - Future: add OpenAI-compatible API support to CLI analysis step.
- **State:** Branch `feat/kreuzberg-extraction` ready to merge (Kreuzberg work complete, tested). MCP implementation plan ready but not started (11 tasks). Output dir: `book-power-output/mcp/facilitating-deliberation/`.
- **Next:**
  1. Merge `feat/kreuzberg-extraction` into master
  2. Execute MCP impl plan (11 tasks) — use `superpowers:executing-plans`
  3. Add OpenAI-compatible API support to CLI (separate task)

## 2026-03-08 — Document extraction upgrade plan (superseded)
- **Superseded by:** Kreuzberg integration above. Plan executed and complete.
- **Original plan:** `docs/plans/2026-03-08-document-extraction-upgrade.md`
