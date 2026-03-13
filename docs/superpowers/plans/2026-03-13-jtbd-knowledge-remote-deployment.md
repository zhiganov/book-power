# jtbd-knowledge Remote Deployment — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy jtbd-knowledge MCP server to Railway with Streamable HTTP transport so non-engineers can connect via Claude Desktop with zero local setup.

**Architecture:** Express server wrapping the existing McpServer with StreamableHTTPServerTransport in stateless mode. Dual transport — HTTP when `PORT` env var is set (Railway), stdio otherwise (local dev). Bearer token auth on `/mcp` routes.

**Tech Stack:** `@modelcontextprotocol/sdk` (StreamableHTTPServerTransport), Express, Railway (Nixpacks)

**Spec:** `docs/superpowers/specs/2026-03-13-jtbd-knowledge-remote-deployment-design.md`

**Working directory:** `C:\Users\temaz\claude-project\book-power-output\mcp\jtbd-knowledge`

---

## Chunk 1: HTTP Transport + Auth

### Task 1: Install dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install express and types**

Run:
```bash
npm install express
npm install --save-dev @types/express
```

- [ ] **Step 2: Verify package.json updated**

Run: `cat package.json | grep express`
Expected: `"express": "^4` or `"^5` in dependencies, `"@types/express"` in devDependencies

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add express dependency for HTTP transport"
```

### Task 2: Add dual transport to index.ts

**Files:**
- Modify: `src/index.ts`

The server creation (`new McpServer(...)`) and all 13 tool registrations stay **exactly as they are**. Only the `main()` function at the bottom changes.

- [ ] **Step 1: Add imports at top of file**

After the existing `StdioServerTransport` import, add:

```typescript
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
```

- [ ] **Step 2: Replace the `main()` function**

Replace everything from `async function main()` to end of file with:

```typescript
function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction): void {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error('API_KEY env var not set');
    res.status(500).json({ error: 'Server misconfigured' });
    return;
  }
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${apiKey}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

async function startHttpServer() {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
  });

  app.all('/mcp', authMiddleware, async (req, res) => {
    await transport.handleRequest(req, res, req.body);
  });

  await server.connect(transport);

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.error(`JTBD Knowledge MCP Server running on HTTP port ${port}`);
  });
}

async function startStdioServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('JTBD Knowledge MCP Server running on stdio');
}

const isHttp = !!process.env.PORT;
(isHttp ? startHttpServer() : startStdioServer()).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
```

- [ ] **Step 3: Build and verify**

Run: `npm run build`
Expected: No errors

- [ ] **Step 4: Test stdio still works**

Run: `echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"0.1"}}}' | node dist/index.js`
Expected: JSON response with server capabilities (may hang after — that's fine, Ctrl+C)

- [ ] **Step 5: Test HTTP mode**

Run in one terminal:
```bash
API_KEY=test-key PORT=3001 node dist/index.js
```

Run in another:
```bash
curl http://localhost:3001/health
```
Expected: `{"status":"ok"}`

Then test auth rejection:
```bash
curl -X POST http://localhost:3001/mcp -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"0.1"}}}'
```
Expected: `{"error":"Unauthorized"}` (no Bearer token)

Then test auth success:
```bash
curl -X POST http://localhost:3001/mcp -H "Content-Type: application/json" -H "Authorization: Bearer test-key" -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"0.1"}}}'
```
Expected: JSON response with server capabilities

- [ ] **Step 6: Commit**

```bash
git add src/index.ts
git commit -m "feat: add HTTP transport with Bearer token auth

Dual transport: HTTP when PORT is set (Railway), stdio otherwise (local dev).
Stateless StreamableHTTPServerTransport with auth middleware."
```

## Chunk 2: Railway Deployment + README

### Task 3: Add railway.json

**Files:**
- Create: `railway.json`

- [ ] **Step 1: Create railway.json**

```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm run build"
  },
  "deploy": {
    "startCommand": "node dist/index.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 5
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add railway.json
git commit -m "feat: add Railway deployment config"
```

### Task 4: Update README for remote-first setup

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace the Installation section**

Replace everything from `## Installation` to just before `## Usage examples` with:

```markdown
## Installation

### Claude Desktop (recommended)

Add to Claude Desktop > Settings > Developer > Edit Config:

\```json
{
  "mcpServers": {
    "jtbd-knowledge": {
      "type": "streamable-http",
      "url": "https://jtbd-knowledge-mcp-production.up.railway.app/mcp",
      "headers": {
        "Authorization": "Bearer <token>"
      }
    }
  }
}
\```

Replace `<token>` with the API key you received. Restart Claude Desktop — you should see a hammer icon with "jtbd-knowledge" in the tools list.

### Claude Code

\```bash
claude mcp add jtbd-knowledge --transport http --url https://jtbd-knowledge-mcp-production.up.railway.app/mcp --header "Authorization: Bearer <token>"
\```

### From source (developers)

\```bash
git clone https://github.com/zhiganov/jtbd-knowledge-mcp.git
cd jtbd-knowledge-mcp
npm install
npm run build
# stdio mode (local):
node dist/index.js
# HTTP mode (local):
API_KEY=your-key PORT=3000 node dist/index.js
\```
```

Note: The Railway domain URL will be updated after deployment (Task 5). Use a placeholder for now.

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: update README for remote-first setup

Primary: Claude Desktop config (paste JSON, done).
Secondary: Claude Code CLI, from-source for developers."
```

### Task 5: Deploy to Railway

- [ ] **Step 1: Push all changes to GitHub**

```bash
git push
```

- [ ] **Step 2: Create Railway project**

```bash
railway init
```

Select "Empty Project" when prompted. Name it `jtbd-knowledge-mcp`.

- [ ] **Step 3: Link to GitHub repo**

Go to Railway dashboard → project → Settings → Connect GitHub repo → select `zhiganov/jtbd-knowledge-mcp`. Or via CLI:

```bash
railway link
```

- [ ] **Step 4: Set environment variables**

Generate a random API key and set it:

```bash
railway variables set API_KEY=$(openssl rand -hex 32)
```

Note down the key — you'll need it for Drea's config.

- [ ] **Step 5: Generate public domain**

```bash
railway domain
```

This creates a `*.up.railway.app` domain. Note the URL.

- [ ] **Step 6: Deploy**

Railway should auto-deploy from the GitHub push. If not:

```bash
railway up --detach
```

- [ ] **Step 7: Verify deployment**

```bash
curl https://<railway-domain>/health
```
Expected: `{"status":"ok"}`

```bash
curl -X POST https://<railway-domain>/mcp -H "Content-Type: application/json" -H "Authorization: Bearer <api-key>" -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"0.1"}}}'
```
Expected: JSON response with server capabilities and 13 tools listed

- [ ] **Step 8: Update README with real domain**

Replace the placeholder `jtbd-knowledge-mcp-production.up.railway.app` with the actual Railway domain in README.md.

```bash
git add README.md
git commit -m "docs: update README with Railway domain"
git push
```

### Task 6: Update CLAUDE.md and process notes

**Files:**
- Modify: `CLAUDE.md` (in jtbd-knowledge repo)
- Modify: `docs/process-notes.md` (in book-power repo)

- [ ] **Step 1: Update CLAUDE.md transport section**

Add after the Stack section:

```markdown
## Deployment

Deployed to Railway (auto-deploys on push to master). Dual transport:
- **HTTP** (Railway): `PORT` env var triggers Express + StreamableHTTPServerTransport with Bearer auth
- **stdio** (local): default when `PORT` is not set

Railway env vars: `API_KEY` (Bearer token for auth), `PORT` (set by Railway).
```

- [ ] **Step 2: Update book-power process notes**

Add entry to `C:\Users\temaz\claude-project\book-power\docs\process-notes.md`:

```markdown
## 2026-03-13 — jtbd-knowledge remote deployment
- **Done:** Added HTTP transport (StreamableHTTPServerTransport, stateless, Express, Bearer auth). Deployed to Railway. Updated README for remote-first setup.
- **Decisions:** Dual transport (HTTP when PORT set, stdio otherwise). Stateless mode — no session management needed. Nixpacks builder.
- **State:** Deployed at https://<railway-domain>/mcp. Auto-deploys on push.
- **Next:** Share URL + API key with Drea. Help her set up Claude Desktop config.
```

- [ ] **Step 3: Commit both**

```bash
git -C <jtbd-knowledge-path> add CLAUDE.md && git -C <jtbd-knowledge-path> commit -m "docs: add deployment section to CLAUDE.md" && git -C <jtbd-knowledge-path> push
git -C <book-power-path> add docs/process-notes.md && git -C <book-power-path> commit -m "docs: add jtbd-knowledge deployment to process notes"
```
