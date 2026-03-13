# jtbd-knowledge Remote Deployment

> Deploy jtbd-knowledge MCP server to Railway with Streamable HTTP transport so non-engineers (starting with Drea) can connect via Claude Desktop with zero local setup.

## Context

jtbd-knowledge is a 13-tool MCP server embedding JTBD methodology from two books (Moesta + Kalbach). Currently stdio-only, requiring Node.js + git clone + build. Drea needs to evaluate the MCP server quality as a domain expert, but she's not an engineer and got stuck trying to set up AI Studio. The goal: she pastes a JSON config block into Claude Desktop and it works.

This pattern should be easy to replicate for other book-power MCP servers (facilitating-deliberation, future ones).

## Architecture

```
Claude Desktop (Drea)
    | HTTP POST (with Bearer token)
    v
Railway (jtbd-knowledge)
    |
Express server (port from $PORT env var)
    |-- Auth middleware (checks API_KEY header)
    |-- POST /mcp -- StreamableHTTPServerTransport (tool calls)
    |-- GET /mcp -- SSE stream (session resumption)
    |-- DELETE /mcp -- session cleanup
    |-- GET /health -- Railway health check
    v
McpServer (same 13 tools, unchanged)
```

## Auth

- Server checks `Authorization: Bearer <token>` header on all `/mcp` routes
- Token stored as `API_KEY` Railway env var (randomly generated)
- Rejection: 401 with clear error message, no tool listing or content leaks
- No rate limiting for now (single known user)

## Drea's Setup

Entire setup is pasting this into Claude Desktop > Settings > Developer > Edit Config:

```json
{
  "mcpServers": {
    "jtbd-knowledge": {
      "type": "streamable-http",
      "url": "https://<railway-domain>/mcp",
      "headers": {
        "Authorization": "Bearer <token>"
      }
    }
  }
}
```

No Node.js, no git, no terminal.

## Files Changed

### `src/index.ts`

Replace the `main()` function. The server creation and all 13 tool registrations stay identical. Only the transport setup changes:

- Import `StreamableHTTPServerTransport` from `@modelcontextprotocol/sdk/server/streamableHttp.js`
- Import `express`
- Create Express app with:
  - Auth middleware on `/mcp` routes (checks `API_KEY` env var)
  - `POST /mcp` — creates `StreamableHTTPServerTransport`, connects to McpServer
  - `GET /mcp` — SSE endpoint for session event streams
  - `DELETE /mcp` — session cleanup
  - `GET /health` — returns 200 (Railway health check)
- Listen on `process.env.PORT || 3000`
- Session management: Map of sessionId → transport, cleaned up on DELETE

Remove `StdioServerTransport` import.

### `package.json`

Add dependencies:
- `express` (runtime)
- `@types/express` (devDependency)

### `railway.json` (new)

```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "node dist/index.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 5
  }
}
```

### `README.md`

Simplify to remote-first:
- Remove "Prerequisites" and "Step 1: Download and build" sections
- Primary installation: paste Claude Desktop config with URL + token
- Keep "From source" as secondary option for developers
- Keep Claude Code section, update to HTTP URL

## Deployment

1. Create Railway project linked to `zhiganov/jtbd-knowledge-mcp` GitHub repo
2. Set env vars: `API_KEY` (generated token)
3. Railway auto-deploys on push to master
4. Generate Railway domain
5. Test with Claude Desktop locally before sharing with Drea

## What Stays the Same

- All 13 tool registrations (zero changes)
- All data files (`src/data/*`)
- `src/search.ts`, `src/types.ts`
- `CLAUDE.md` (update transport note)
- `.gitignore`, `tsconfig.json`

## Reusability

The Express + auth + StreamableHTTPServerTransport wrapper is ~40 lines. Other book-power MCP servers can copy `main()` and `railway.json` to get the same deployment pattern. No shared library needed — it's small enough to duplicate.

## Risks

- **Claude Desktop Streamable HTTP support**: Verify Claude Desktop supports `"type": "streamable-http"` in config. If not, fall back to SSE transport (`SSEServerTransport`).
- **Railway cold starts**: Free tier may have cold starts. If latency is a problem, upgrade to a paid plan or add a keep-alive ping.
- **Session state**: StreamableHTTPServerTransport is stateful (session map). Railway restarts will lose sessions — acceptable for this use case (tool calls are stateless, no conversation state in the server).
