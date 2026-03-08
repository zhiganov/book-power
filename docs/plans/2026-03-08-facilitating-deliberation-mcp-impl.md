# Facilitating Deliberation MCP Server — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Use TypeScript LSP for all TS work.

**Goal:** Build a 12-tool MCP server embedding deliberation facilitation methodology from "Facilitating Deliberation – A Practical Guide" (White, Hunter, Greaves).

**Architecture:** Practitioner toolkit with embedded TypeScript constants. Three layers: reference tools (5), design tools (4), facilitation tools (3). Follows jtbd-knowledge server pattern — `@modelcontextprotocol/sdk` + `zod` + substring search.

**Tech Stack:** TypeScript strict ESM, `@modelcontextprotocol/sdk`, `zod` v4, stdio transport

**Source content:** `book-power/books/facilitating-deliberation.md` (Datalab-extracted, 92K words, 59 chapters)

**Reference implementation:** `book-power-output/mcp/jtbd-knowledge/` (13 tools, same architecture)

---

### Task 1: Scaffold project

**Files:**
- Create: `book-power-output/mcp/facilitating-deliberation/package.json`
- Create: `book-power-output/mcp/facilitating-deliberation/tsconfig.json`
- Create: `book-power-output/mcp/facilitating-deliberation/src/types.ts`

**Step 1: Create package.json**

```json
{
  "name": "mcp-facilitating-deliberation",
  "version": "0.1.0",
  "description": "Deliberation facilitation methodology MCP server — White, Hunter, Greaves",
  "type": "module",
  "bin": {
    "mcp-facilitating-deliberation": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx src/index.ts"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.27.1",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "tsx": "^4.19.0",
    "typescript": "^5.3.0",
    "@types/node": "^22.0.0"
  },
  "license": "UNLICENSED"
}
```

**Step 2: Create tsconfig.json**

Copy from jtbd-knowledge — same settings (ES2022, Node16, strict).

**Step 3: Create src/types.ts**

```typescript
export interface Principle {
  number: number;
  name: string;
  type: 'deliberation' | 'facilitation';
  description: string;
  practice: string;
  tips: string[];
}

export interface Step {
  number: number;
  name: string;
  purpose: string;
  subSteps: SubStep[];
  activities: string[];
  tips: string[];
  pitfalls: string[];
  onlineAdaptations?: string;
}

export interface SubStep {
  id: string;
  name: string;
  description: string;
  guidance: string;
}

export interface Activity {
  id: string;
  name: string;
  purpose: string;
  instructions: string;
  timing: string;
  groupSize?: string;
  variations?: string[];
  steps: number[];
  format: ('face-to-face' | 'online' | 'both')[];
}

export interface Framework {
  id: string;
  name: string;
  description: string;
  elements: FrameworkElement[];
  usage: string;
}

export interface FrameworkElement {
  name: string;
  description: string;
}

export interface Checklist {
  id: string;
  name: string;
  stage: string;
  items: ChecklistItem[];
}

export interface ChecklistItem {
  label: string;
  description: string;
  critical: boolean;
}

export interface DesignTemplate {
  id: string;
  name: string;
  purpose: string;
  instructions: string;
  sections: TemplateSection[];
}

export interface TemplateSection {
  heading: string;
  prompts: string[];
  guidance: string;
  example?: string;
}

export interface SearchResult {
  type: 'principle' | 'step' | 'activity' | 'framework' | 'checklist' | 'template';
  id: string;
  name: string;
  excerpt: string;
}
```

**Step 4: Run `npm install`**

```bash
cd book-power-output/mcp/facilitating-deliberation && npm install
```

**Step 5: Verify types compile**

```bash
npx tsc --noEmit
```

**Step 6: Commit**

```bash
git add package.json tsconfig.json src/types.ts
git commit -m "feat: scaffold facilitating-deliberation MCP server"
```

---

### Task 2: Populate principles data

**Files:**
- Create: `src/data/principles.ts`

Extract all 20 principles from the book content (sections 2.2 and 4.1). Each principle needs: number, name, type, description, practice guidance, tips. Read the source content at `book-power/books/facilitating-deliberation.md` — search for section 2.2 (deliberation principles) and section 4.1 (facilitation principles).

**Step 1: Create `src/data/principles.ts`**

Populate with `Principle[]` constant. 10 deliberation principles + 10 facilitation principles. Include practical guidance from the book, not just definitions.

**Step 2: Verify types compile**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/data/principles.ts
git commit -m "data: add 20 deliberation and facilitation principles"
```

---

### Task 3: Populate steps data

**Files:**
- Create: `src/data/steps.ts`

Extract the 7 core steps from sections 4.2 and chapter 5 (Steps 1-7). Each step needs sub-steps, recommended activities, tips, pitfalls, and online adaptations where noted.

**Step 1: Create `src/data/steps.ts`**

Populate with `Step[]` constant. Read chapter 5 carefully — each step has 3-8 sub-steps with detailed guidance.

**Step 2: Verify types compile**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/data/steps.ts
git commit -m "data: add 7 core facilitation steps with sub-steps"
```

---

### Task 4: Populate activities data

**Files:**
- Create: `src/data/activities.ts`

Extract ~25 activities from Appendix 2. Each activity needs: id, name, purpose, instructions, timing, group size, variations, which steps it works for, and format (face-to-face/online/both).

**Step 1: Create `src/data/activities.ts`**

Populate with `Activity[]` constant. The `steps` field should reference which of the 7 core steps each activity is used for. Read Appendix 2 in the source content.

**Step 2: Verify types compile**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/data/activities.ts
git commit -m "data: add ~25 facilitation activities from Appendix 2"
```

---

### Task 5: Populate frameworks, checklists, and templates data

**Files:**
- Create: `src/data/frameworks.ts`
- Create: `src/data/checklists.ts`
- Create: `src/data/templates.ts`
- Create: `src/data/index.ts`

**Step 1: Create `src/data/frameworks.ts`**

4 frameworks: Kaner's Diamond (4.3.1), ORID Focused Conversation (4.3.1), Love It/Loathe It 5L Scale (4.3.4), IAP2 Spectrum (3.1.6).

**Step 2: Create `src/data/checklists.ts`**

5 checklists: macro-design (3.1.2), recruitment (3.2), information (3.3), facilitation-team (5.2), closing (5.7). Each with items marked critical/non-critical.

**Step 3: Create `src/data/templates.ts`**

2 design templates: macro-design template (all 16 elements from 3.1) and micro-design template (run sheet structure from 4.6). Also readiness assessment (2.7). Each template has sections with prompts and guidance.

**Step 4: Create `src/data/index.ts`**

Re-export all data modules:

```typescript
export { PRINCIPLES } from './principles.js';
export { STEPS } from './steps.js';
export { ACTIVITIES } from './activities.js';
export { FRAMEWORKS } from './frameworks.js';
export { CHECKLISTS } from './checklists.js';
export { TEMPLATES } from './templates.js';
```

**Step 5: Verify types compile**

```bash
npx tsc --noEmit
```

**Step 6: Commit**

```bash
git add src/data/
git commit -m "data: add frameworks, checklists, design templates"
```

---

### Task 6: Build search module

**Files:**
- Create: `src/search.ts`

**Step 1: Create `src/search.ts`**

Case-insensitive substring search across all 6 content types (principles, steps, activities, frameworks, checklists, templates). Follow jtbd-knowledge's `search.ts` pattern.

```typescript
import type { SearchResult } from './types.js';
import { PRINCIPLES, STEPS, ACTIVITIES, FRAMEWORKS, CHECKLISTS, TEMPLATES } from './data/index.js';

export function searchAll(query: string, maxResults: number = 10): SearchResult[] {
  const q = query.toLowerCase();
  const results: SearchResult[] = [];

  for (const p of PRINCIPLES) {
    const searchable = `${p.name} ${p.description} ${p.practice} ${p.tips.join(' ')}`.toLowerCase();
    if (searchable.includes(q)) {
      results.push({ type: 'principle', id: `${p.type}-${p.number}`, name: p.name, excerpt: p.description });
    }
  }

  for (const s of STEPS) {
    const searchable = `${s.name} ${s.purpose} ${s.subSteps.map(ss => `${ss.name} ${ss.description}`).join(' ')} ${s.tips.join(' ')}`.toLowerCase();
    if (searchable.includes(q)) {
      results.push({ type: 'step', id: `step-${s.number}`, name: `Step ${s.number}: ${s.name}`, excerpt: s.purpose });
    }
  }

  for (const a of ACTIVITIES) {
    const searchable = `${a.name} ${a.purpose} ${a.instructions}`.toLowerCase();
    if (searchable.includes(q)) {
      results.push({ type: 'activity', id: a.id, name: a.name, excerpt: a.purpose });
    }
  }

  for (const f of FRAMEWORKS) {
    const searchable = `${f.name} ${f.description} ${f.elements.map(e => `${e.name} ${e.description}`).join(' ')}`.toLowerCase();
    if (searchable.includes(q)) {
      results.push({ type: 'framework', id: f.id, name: f.name, excerpt: f.description });
    }
  }

  for (const c of CHECKLISTS) {
    const searchable = `${c.name} ${c.items.map(i => `${i.label} ${i.description}`).join(' ')}`.toLowerCase();
    if (searchable.includes(q)) {
      results.push({ type: 'checklist', id: c.id, name: c.name, excerpt: `${c.items.length} items for ${c.stage}` });
    }
  }

  for (const t of TEMPLATES) {
    const searchable = `${t.name} ${t.purpose} ${t.sections.map(s => `${s.heading} ${s.prompts.join(' ')}`).join(' ')}`.toLowerCase();
    if (searchable.includes(q)) {
      results.push({ type: 'template', id: t.id, name: t.name, excerpt: t.purpose });
    }
  }

  return results.slice(0, maxResults);
}
```

**Step 2: Verify types compile**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/search.ts
git commit -m "feat: add substring search across all content types"
```

---

### Task 7: Build MCP server (index.ts) — reference tools

**Files:**
- Create: `src/index.ts`

**Step 1: Create `src/index.ts` with 5 reference tools**

Follow jtbd-knowledge's `index.ts` pattern exactly:
- `search_content` — query + max_results
- `get_principle` — type (deliberation/facilitation) + optional number
- `get_step` — step number 1-7
- `get_activity` — activity name/id
- `list_all` — type enum (principles, steps, activities, frameworks, checklists)

Each tool should return helpful error messages listing available options when an item isn't found.

**Step 2: Verify types compile**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/index.ts
git commit -m "feat: add 5 reference tools to MCP server"
```

---

### Task 8: Add design tools to index.ts

**Files:**
- Modify: `src/index.ts`

**Step 1: Add 4 design tools**

- `get_macro_design_template` — optional element filter
- `get_micro_design_template` — optional step number filter
- `get_readiness_assessment` — no params
- `get_checklist` — type enum (macro_design, recruitment, information, facilitation_team, closing)

**Step 2: Verify types compile**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/index.ts
git commit -m "feat: add 4 design tools to MCP server"
```

---

### Task 9: Add facilitation tools to index.ts

**Files:**
- Modify: `src/index.ts`

**Step 1: Add 3 facilitation tools**

- `suggest_activity` — step number + optional context string. Filters activities by step, optionally by format (scan context for "online"/"face-to-face") and returns recommended activities.
- `get_framework` — framework name/id
- `suggest_next_step` — current step number + optional context. Returns guidance on what comes next, what to watch for, transition tips. Simple state machine over the 7 steps.

**Step 2: Add server startup (stdio transport)**

```typescript
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Facilitating Deliberation MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
```

**Step 3: Verify types compile**

```bash
npx tsc --noEmit
```

**Step 4: Build and test**

```bash
npm run build
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | node dist/index.js
```

Should see `initialize` response without crashing.

**Step 5: Commit**

```bash
git add src/index.ts
git commit -m "feat: add 3 facilitation tools, complete 12-tool MCP server"
```

---

### Task 10: Create CLAUDE.md and verify

**Files:**
- Create: `CLAUDE.md`

**Step 1: Create CLAUDE.md**

Document: overview, commands, architecture, tool groups, data files, design decisions. Follow jtbd-knowledge's CLAUDE.md pattern.

**Step 2: Full build and smoke test**

```bash
npm run build
```

Test a tool call:
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"list_all","arguments":{"type":"steps"}}}' | node dist/index.js
```

**Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add CLAUDE.md for facilitating-deliberation MCP server"
```

---

### Task 11: Install MCP server locally

**Step 1: Add to Claude Code MCP config**

```bash
claude mcp add-json facilitating-deliberation '{"command":"node","args":["C:/Users/temaz/claude-project/book-power-output/mcp/facilitating-deliberation/dist/index.js"],"type":"stdio"}' -s local
```

**Step 2: Verify tools appear**

Restart Claude Code and verify 12 tools are available.

**Step 3: Smoke test**

Call `list_all` with type "steps" to verify data loads correctly.
