# Process Notes — book-power

## 2026-03-13 — Plurality book downloaded, MCP server planned
- **Done:** Downloaded all 36 chapters of Glen Weyl & Audrey Tang's "Plurality: The Future of Collaborative Technology and Democracy" from `pluralitybook/plurality` GitHub repo. Combined into `books/plurality-full.md` (1M chars). CC0 license — can publish MCP server publicly.
- **Decisions:** Hand-crafted MCP server (not generic pipeline). Will be the first public book-power MCP server (no auth needed). Directly relevant to Harmonica, gov/acc, Open Civics.
- **State:** Raw chapters at `books/plurality-raw/`, combined at `books/plurality-full.md`. No analysis or design started yet.
- **Next:** Brainstorm MCP server design — analyze content, identify key concepts/frameworks, design purpose-built tools. Deploy to Railway (public, no auth). Book structure: philosophy of plurality (Part 3), rights/freedoms as tech (Part 4), collaborative tech for democracy (Part 5), real-world applications (Part 6), policy (Part 7).

## 2026-03-13 — jtbd-knowledge remote deployment
- **Done:** Added HTTP transport (StreamableHTTPServerTransport, stateless, Express, Bearer auth). Deployed to Railway. Updated README for remote-first setup (paste JSON config, done).
- **Decisions:** Dual transport (HTTP when PORT set, stdio otherwise). Stateless mode — no session management needed. Nixpacks builder. API key auth.
- **State:** Live at `https://jtbd-knowledge-mcp-production.up.railway.app/mcp`. Auto-deploys on push to master. Currently using `railway up` deploys — need to connect GitHub repo in Railway dashboard for true auto-deploy.
- **Next:** Share URL + API key with Drea on Discord. Help her set up Claude Desktop config. Connect GitHub repo in Railway for auto-deploys.

## 2026-03-13 — Call with Drea: publisher lead + validation plan

- **Source:** March 11 "Road to PMF with Drea" call (Fireflies transcript `01KK989J45GZEA8XSANY2FN8Q9`)
- **Publisher lead:** Drea knows Lou Rosenfeld (Rosenfeld Media) personally — offered to introduce. Lou publishes UX/business methodology books (exact target audience for book-power). Drea's insight: most authors write books as marketing for consulting → MCP servers complement that. "Zero chance he's not thinking about this."
- **Validation:** Drea asked to be invited to jtbd-knowledge MCP server specifically — she knows JTBD material well and can assess quality as a domain expert. She doesn't know how to use MCP servers without Claude Code; may need help setting up.
- **Drea on copyright:** "You don't want to get in a fight with O'Reilly." Reinforces the IP-safe approach (open-source books, publisher partnerships, user-supplied content).
- **Tasks created:** task-13 (jtbd-knowledge private repo + invite Drea), task-14 (Lou Rosenfeld intro package).
- **Updated:** Commercialization notes with Rosenfeld Media lead section.
- **Next:** Prepare materials for Lou intro, create jtbd-knowledge repo, help Drea set up Claude Code or equivalent to test MCP server.

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

## 2026-03-09 — README cleanup
- **Done:** Updated README: moved facilitating-deliberation from "In progress" to "Private" in table, moved its detailed section from Vision to sit alongside jtbd-knowledge under "Built with book-power".
- **Decisions:** Built servers get their own section next to each other, Vision stays for future/aspirational items only.
- **State:** README pushed to master.
- **Next:** None for book-power this session.

## 2026-03-09 — Facilitating Deliberation MCP built and shared
- **Done:** Merged `feat/kreuzberg-extraction` into master. Built complete 12-tool MCP server (all 11 impl tasks). Created private GitHub repo, transferred to OFL org. Created HAR-413 (MosaicLab licensing email). Added README with installation, usage examples, Harmonica/Habermolt integration.
- **Decisions:** Private repo under OFL org (not personal account). No npm publish — copyrighted material, share via GitHub access. Two install paths: clone+build or `npm install -g` from GitHub.
- **State:** Server complete and installed locally. Repo at `Open-Facilitation-Library/facilitating-deliberation-mcp`. GitHub MCP plugin needs PAT verification.
- **Next:** Email MosaicLab (HAR-413). Verify GitHub MCP plugin auth works after PAT was added.

## 2026-03-08 — Document extraction upgrade plan (superseded)
- **Superseded by:** Kreuzberg integration above. Plan executed and complete.
- **Original plan:** `docs/plans/2026-03-08-document-extraction-upgrade.md`
