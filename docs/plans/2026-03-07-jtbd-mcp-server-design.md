# JTBD Knowledge MCP Server — Design Document

**Date:** 2026-03-07
**Status:** Draft
**Author:** Claude + Tema

---

## Problem

Tema wants to apply JTBD methodology (Moesta's Demand-Side Sales + Kalbach's JTBD Playbook) to Harmonica's Growth & Marketing initiative. The books contain structured frameworks, interview techniques, analysis workflows, and recipes — but this knowledge needs to be accessible during actual product work (preparing interviews, analyzing transcripts, creating Linear issues).

## Goals

1. Make JTBD methodology from both books available as an MCP server for personal use
2. Support the full JTBD toolkit: interview prep → transcript analysis → synthesis → strategy → Linear issues
3. Provide workflow navigation — know which framework to use when, and what comes next
4. Extensible to additional JTBD books in the future

## Non-Goals

- Publishing as open source (copyrighted content, personal use only)
- Vector search / RAG (structured data is sufficient)
- LLM calls inside the server (Claude in conversation does all analysis)

## Architecture: Hybrid — Smart Reference + Structured Templates

The server provides **methodology scaffolding**; Claude (in conversation) does the **analytical heavy lifting**.

Three layers:
1. **Reference tools** — look up frameworks, workflows, templates, quotes from both books
2. **Guided analysis templates** — structured prompts that Claude fills in from real data (transcripts, surveys)
3. **Output formatters + workflow navigator** — structure results and suggest next steps

### Data Model

```typescript
// Embedded in src/data.ts

interface Book {
  id: string;           // "moesta-demand-side-sales" | "kalbach-jtbd-playbook"
  title: string;
  author: string;
  year: number;
}

interface Framework {
  id: string;           // "four-forces" | "universal-job-map" | "odi-scoring" | ...
  name: string;
  book: string;         // book id
  chapter: string;
  description: string;
  elements: string[];   // structured components
  diagram?: string;     // ASCII or description
  source_quote?: string;
}

interface Workflow {
  id: string;           // "switch-interview" | "job-mapping" | "find-underserved-needs" | ...
  name: string;
  book: string;
  chapter: string;
  description: string;
  steps: WorkflowStep[];
  inputs: string[];     // what you need before starting
  outputs: string[];    // what you produce
  related_frameworks: string[];  // framework ids used
}

interface WorkflowStep {
  number: number;
  action: string;
  details: string;
  tips?: string[];
}

interface Recipe {
  id: string;           // "launch-new-product" | "increase-demand" | ...
  name: string;
  book: string;         // "kalbach-jtbd-playbook"
  goal: string;
  workflow_sequence: string[];  // ordered workflow ids
  description: string;
}

interface InterviewQuestion {
  category: string;     // "background" | "main-job" | "process" | "needs" | "circumstances" | "forces" | "timeline"
  question: string;
  source: string;       // book id
  probing_tips?: string[];
}

interface Template {
  id: string;
  name: string;
  book: string;
  format: string;       // the template text with placeholders
  example?: string;
  usage: string;
}

interface Concept {
  name: string;
  definition: string;
  book: string;
  related_concepts?: string[];
}

interface AnalysisTemplate {
  id: string;           // "forces-analysis" | "timeline-extraction" | "job-map-construction" | "odi-scoring"
  name: string;
  purpose: string;
  input_description: string;   // what Claude needs (transcript, survey data, etc.)
  instructions: string;        // step-by-step for Claude to follow
  output_schema: string;       // expected structure of the result
  frameworks_used: string[];   // which frameworks this applies
}

interface Quote {
  text: string;
  attribution: string;
  book: string;
  chapter: string;
  topic_tags: string[];
}
```

### Tool Design (13 tools)

#### Reference Tools (6)

| Tool | Parameters | Returns |
|------|-----------|---------|
| `search_content` | `query: string`, `book?: string` | Matching frameworks, workflows, concepts, quotes — substring search across all content |
| `get_framework` | `id: string` | Full framework details: description, elements, diagram, source |
| `get_workflow` | `id: string` | Step-by-step workflow with inputs, outputs, tips |
| `get_recipe` | `id: string` | Recipe goal + ordered sequence of workflows to execute |
| `get_interview_questions` | `type: "jobs" \| "switch" \| "cancellation"`, `topic_area?: string` | Curated question set for the interview type |
| `list_all` | `type: "frameworks" \| "workflows" \| "recipes" \| "templates" \| "concepts"` | Names + brief descriptions of all items of that type |

#### Guided Analysis Tools (4)

| Tool | Parameters | Returns |
|------|-----------|---------|
| `get_analysis_template` | `type: "forces" \| "timeline" \| "job_map" \| "odi" \| "personas" \| "competing_solutions"` | Structured template with instructions for Claude to fill in from data |
| `get_output_format` | `type: "job_story" \| "value_proposition" \| "desired_outcome" \| "job_statement"` | Format specification + examples + rules for generating these artifacts |
| `format_action_items` | `analysis_type: string`, `project_context?: string` | Template for translating JTBD analysis into actionable issues — takes project context as input (PM system, team structure, initiatives) so it works for any project, not just Harmonica |
| `suggest_next_step` | `current_stage: string`, `goal?: string` | Based on recipes + workflow graph, recommends what to do next and which tool to call |

#### Navigation Tools (3)

| Tool | Parameters | Returns |
|------|-----------|---------|
| `get_technique` | `name: string` | Interview technique details (e.g., "unpack vague words", "play it back wrong") |
| `compare_books` | `topic: string` | How Moesta and Kalbach each treat a topic (forces, interviews, job mapping, etc.) |
| `get_quote` | `topic?: string` | Relevant quote(s) from either book |

### Content Inventory

From the two book analyses, the server will embed:

**Frameworks (23):**
- Moesta (11): Four Forces, JTBD Timeline (6 phases), Three Sources of Energy, Kano Model, Supply vs Demand, Domino Effect, Time Wall, Contrast/Value, Hiring/Firing, Little/Big Hires, Competitive Set
- Kalbach (12): JTBD Framework (5 elements), JTBD Hierarchy (4 levels), Universal Job Map (8 stages), Four Forces, Switch Timeline, ODI, VPC, Growth Strategy Matrix, HPF, Fogg Behavior Model, Onboarding Assessment Matrix, Jobs Atlas

**Workflows (13+):**
- Moesta (4): JTBD Interview, Buyer Timeline Mapping, Five Progress Tools, Getting Started
- Kalbach (13): Jobs Interviews, Switch Interviews, Four Forces Analysis, Job Mapping, Underserved Needs (ODI), Goal-Based Personas, Competing Solutions Comparison, Value Proposition, Job Stories, Development Roadmap, Cancellation Interviews, Survive Disruption, Organize Around Jobs

**Recipes (5, Kalbach):**
1. Launch a New Product
2. Optimize an Existing Product
3. Increase Demand
4. Make Customers Successful Over Time
5. Build Corporate Innovation Strategy

**Interview Questions:** ~30 questions across 7 categories (both books combined)

**Templates (11):** Job Statement, Desired Outcome, Job Story, JTBD Canvas, Proto-Persona Grid, Interview Analysis Spreadsheet, Recruiting Screener, Jobs Scoring Sheet, Value Proposition Statement, Hypothesis Templates, Disruption Diagnostic Canvas

**Analysis Templates (6):** Forces Analysis, Timeline Extraction, Job Map Construction, ODI Scoring, Persona Building, Competing Solutions Analysis

**Concepts (28):** Combined from both books, deduplicated

**Quotes (28):** 14 from each book

### Project Structure

```
book-power-output/mcp/jtbd-knowledge/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts          # MCP server — tool definitions + handlers
│   ├── data.ts           # All embedded content (frameworks, workflows, etc.)
│   ├── search.ts         # Substring search across all content types
│   └── types.ts          # TypeScript interfaces
```

### How It's Used — Example Workflows

**Workflow 1: Prepare for user interviews**
```
User: "I need to interview churned Harmonica users"
→ suggest_next_step("starting", "understand churn")
  → Returns: "Use Recipe: 'Increase Demand' — start with Switch Interviews"
→ get_recipe("increase-demand")
  → Returns: Switch interviews → Four Forces → Job stories → Roadmap
→ get_interview_questions("switch")
  → Returns: curated questions for switch interviews
→ get_technique("unpack-vague-words")
  → Returns: technique details and examples
```

**Workflow 2: Analyze interview transcript**
```
User: [pastes transcript]
→ get_analysis_template("forces")
  → Returns: structured template — Claude extracts push/pull/anxiety/habit from transcript
→ get_analysis_template("timeline")
  → Returns: template — Claude maps the 6-phase buyer timeline
→ suggest_next_step("forces-and-timeline-extracted")
  → Returns: "Synthesize across interviews, or build job map"
```

**Workflow 3: Translate findings to action items**
```
User: "Turn these interview findings into Linear issues"
→ format_action_items("forces-analysis", "Linear: Growth & Marketing initiative, projects: Marketing Research, Product Growth")
  → Returns: template for structuring issues with JTBD context, adapted to the provided PM structure
→ Claude creates issues via Linear MCP
```

**Workflow 4: Compare methodological approaches**
```
User: "How should I think about forces?"
→ compare_books("four forces")
  → Returns: Moesta's sales framing vs Kalbach's product framing, side by side
```

## Implementation Notes

- Build with `@modelcontextprotocol/sdk` (TypeScript)
- All data embedded as constants — no external files or databases
- Substring search (case-insensitive) across names, descriptions, and content
- `suggest_next_step` uses a simple state machine based on Kalbach's recipes
- No API keys needed — pure reference server
- Install locally via `claude mcp add-json` with stdio transport

## Open Questions

None remaining.

---

## Decision Log

- **Approach C chosen over A and B** — A (pure reference) underuses the methodology; B (analytical toolkit) would need LLM calls in the server or just be prompts-in-disguise. C gives structured methodology + Claude does analysis.
- **Analysis templates stay generic JTBD** — Not Harmonica-specific. The server should be reusable across any project.
- **`format_action_items` is project-agnostic** — Takes project context (PM system, team structure, initiatives) as input parameter. When used with Harmonica, you pass the Linear structure; with another project, you pass whatever PM system it uses.
- **No vector search** — Content is structured (frameworks, steps, questions), not prose. Substring search over ~200 entries is sufficient.
- **Two books combined, not separate servers** — Cross-referencing (compare_books, merged question sets) adds value. Same topic treated differently by each author.
