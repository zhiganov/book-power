# Facilitating Deliberation MCP Server — Design Document

**Date:** 2026-03-08
**Status:** Approved
**Author:** Claude + Tema

---

## Problem

"Facilitating Deliberation – A Practical Guide" by Kimbra White, Nicole Hunter & Keith Greaves (MosaicLab, 2022) is a comprehensive practitioner guide for deliberative democracy facilitation. Now freely available via AI & Democracy Foundation. The book contains structured methodology — principles, steps, activities, checklists, design frameworks — that needs to be accessible during deliberation planning and AI agent development.

## Goals

1. Make facilitation methodology available as an MCP server for two audiences:
   - Facilitators using Claude to plan and run real deliberations
   - Developers building AI deliberation agents (e.g., Habermolt)
2. Support the full workflow: assess readiness → macro-design → micro-design → facilitate (7 steps) → close
3. Provide guided templates that help Claude walk through design decisions with users
4. Expose methodology as structured data consumable by both humans and AI systems

## Non-Goals

- Publishing copyrighted content (book is now free but copyright is "All rights reserved")
- Vector search / RAG (structured data is sufficient)
- LLM calls inside the server (Claude in conversation does analysis)
- Replacing the book (server provides scaffolding, not full text)

## Architecture: Practitioner Toolkit

The server provides **methodology scaffolding** organized around the deliberation workflow; Claude (in conversation) does the **analytical and planning work**.

Three layers:
1. **Reference tools** — look up principles, steps, activities, frameworks
2. **Design templates** — guided prompts for macro-design, micro-design, readiness assessment
3. **Navigation tools** — suggest activities, recommend next steps

### Data Model

```typescript
interface Principle {
  number: number;
  name: string;
  type: 'deliberation' | 'facilitation';
  description: string;
  practice: string;       // how to put it into practice
  tips: string[];
}

interface Step {
  number: number;          // 1-7
  name: string;            // "Understanding Purpose"
  purpose: string;
  subSteps: SubStep[];
  activities: string[];    // activity ids that work for this step
  tips: string[];
  pitfalls: string[];
  onlineAdaptations?: string;
}

interface SubStep {
  id: string;              // "1.1", "1.2", etc.
  name: string;
  description: string;
  guidance: string;
}

interface Activity {
  id: string;              // "fishbowl", "orid", "speed-dialogue"
  name: string;
  purpose: string;
  instructions: string;
  timing: string;          // "30-45 minutes"
  groupSize?: string;      // "small groups of 4-6"
  variations?: string[];
  steps: string[];         // which of the 7 steps this works for
  format: ('face-to-face' | 'online' | 'both')[];
}

interface Framework {
  id: string;              // "kaners-diamond", "orid", "5l-scale", "iap2"
  name: string;
  description: string;
  elements: string[];      // stages, levels, or components
  usage: string;           // when and how to apply
}

interface Checklist {
  id: string;
  name: string;
  stage: string;           // "macro-design", "recruitment", etc.
  items: ChecklistItem[];
}

interface ChecklistItem {
  label: string;
  description: string;
  critical: boolean;       // must-have vs nice-to-have
}

interface DesignTemplate {
  id: string;
  name: string;
  purpose: string;
  instructions: string;    // step-by-step for Claude to guide the user
  sections: TemplateSection[];
}

interface TemplateSection {
  heading: string;
  prompts: string[];       // questions to work through
  guidance: string;
  example?: string;
}
```

### Tool Design (12 tools)

#### Reference Tools (5)

| Tool | Parameters | Returns |
|------|-----------|---------|
| `search_content` | `query: string` | Substring search across all principles, steps, activities, frameworks |
| `get_principle` | `type: "deliberation" \| "facilitation"`, `number?: number` | One or all 10 principles with practice guidance |
| `get_step` | `step: 1-7` | Full step details: purpose, sub-steps, activities, tips, common pitfalls |
| `get_activity` | `name: string` | Activity description, purpose, timing, instructions, variations |
| `list_all` | `type: "principles" \| "steps" \| "activities" \| "frameworks" \| "checklists"` | Names + brief descriptions |

#### Design Tools (4)

| Tool | Parameters | Returns |
|------|-----------|---------|
| `get_macro_design_template` | `element?: string` | Checklist + guidance for macro-design (remit, scope, promise, timeframe, etc.) |
| `get_micro_design_template` | `step?: 1-7` | Template for daily run sheets, activity selection, timing |
| `get_readiness_assessment` | — | Organizational readiness checklist with criteria |
| `get_checklist` | `type: "macro_design" \| "recruitment" \| "information" \| "facilitation_team" \| "closing"` | Stage-specific checklists |

#### Facilitation Tools (3)

| Tool | Parameters | Returns |
|------|-----------|---------|
| `suggest_activity` | `step: 1-7`, `context?: string` | Recommends activities for a given step based on context (online/face-to-face, group size, time available) |
| `get_framework` | `name: string` | Decision framework details (Kaner's Diamond, ORID, 5L Scale, IAP2 Spectrum) |
| `suggest_next_step` | `current_step: 1-7`, `context?: string` | What comes next, what to watch for, transition guidance |

### Content Inventory

**Principles (20):**
- 10 Deliberation Principles (Section 2.2): Clear Remit, Influence, Information, Representation, Time, Group Deliberation, Blank-Page Report, Transparency, Independent Facilitation, Inclusion
- 10 Facilitation Principles (Section 4.1): Comprehensive Planning, Independence & Neutrality, Clear Purpose & Task Focus, Respect for Participants, Respectful Relationships, Participation, Group Responsibility, Information Management, Adaptive Facilitation, Transparency

**Steps (7):** Understanding Purpose, Relationship-Building, Skill Development, Information, Group Dialogue & Deliberation, Group Decision-Making, Presentation & Closing — each with 3-8 sub-steps

**Activities (~25):** Brainstorming, Closing Circle, Card-Storming/Clustering, Critical Thinking & Brain Biases, Deep Democracy, Exhibition, Fishbowl, ORID Focused Conversation, Greeting Line, Ideas-Rating/5L Scale, Library Time, Opening/Closing Activities, Option 1½, Perspectives, Pitch Process, Q&A, Reverse Q&A, Rip It Up, Social Styles, Sociometry, Speed Dialogue, Storytelling, Textra, Think Pair Share, Visioning

**Frameworks (4):** Kaner's Diamond, ORID, Love It/Loathe It (5L) Scale, IAP2 Spectrum

**Checklists (5):** Macro-design, Recruitment, Information, Facilitation Team, Closing

**Design Templates (2):** Macro-design (16 elements), Micro-design (run sheets, activity selection)

**Readiness Assessment:** Organizational readiness criteria

### Project Structure

```
book-power-output/mcp/facilitating-deliberation/
├── package.json
├── tsconfig.json
├── CLAUDE.md
├── src/
│   ├── index.ts          # MCP server — tool definitions + handlers
│   ├── types.ts          # TypeScript interfaces
│   ├── search.ts         # Substring search across all content types
│   └── data/
│       ├── index.ts      # Re-exports all data
│       ├── principles.ts # 20 principles (deliberation + facilitation)
│       ├── steps.ts      # 7 core steps with sub-steps
│       ├── activities.ts # ~25 activity descriptions
│       ├── frameworks.ts # 4 decision frameworks
│       ├── checklists.ts # 5 stage-specific checklists
│       └── templates.ts  # Design templates (macro + micro)
```

### How It's Used — Example Workflows

**Workflow 1: Plan a new citizens' jury**
```
User: "I need to plan a citizens' jury on local housing policy"
→ get_readiness_assessment()
  → Returns: organizational readiness checklist — Claude walks through each criterion
→ get_macro_design_template()
  → Returns: 16-element design template — Claude helps draft remit, scope, promise
→ get_checklist("recruitment")
  → Returns: recruitment planning checklist
```

**Workflow 2: Design facilitation for Day 2**
```
User: "I need to plan the second day of our deliberation — we're on Step 4 (Information)"
→ get_step(4)
  → Returns: full step details with sub-steps and recommended activities
→ suggest_activity(4, "face-to-face, 25 participants, 6 hours available")
  → Returns: recommended activity sequence for information delivery
→ get_micro_design_template(4)
  → Returns: run sheet template for the day
```

**Workflow 3: Build an AI deliberation agent**
```
Developer: "I'm building an AI facilitator — what are the core principles?"
→ get_principle("facilitation")
  → Returns: all 10 facilitation principles with practice guidance
→ list_all("steps")
  → Returns: 7-step overview — developer maps to agent workflow
→ get_framework("kaners-diamond")
  → Returns: divergent → groan zone → convergent model for agent decision flow
```

## Implementation Notes

- Build with `@modelcontextprotocol/sdk` (TypeScript)
- All data embedded as constants — no external files or databases
- Substring search (case-insensitive) across names, descriptions, and content
- Use TypeScript LSP for all development
- No API keys needed — pure reference server
- Install locally via `claude mcp add-json` with stdio transport

## Decision Log

- **Approach A (Practitioner Toolkit) chosen** over B (Reference Library) and C (Workflow Engine). A provides guided methodology without overengineering state tracking.
- **12 tools** — balanced between reference (5), design (4), and facilitation (3)
- **Two audiences:** facilitators planning deliberations + AI agent developers
- **Book freely available** but copyright says "All rights reserved" — extract methodology, not full text
- **Follows jtbd-knowledge pattern** — same architecture (embedded data, substring search, guided templates, MCP SDK)
