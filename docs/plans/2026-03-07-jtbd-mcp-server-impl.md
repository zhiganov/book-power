# JTBD Knowledge MCP Server — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a personal MCP server that embeds JTBD methodology from Moesta's "Demand-Side Sales" and Kalbach's "JTBD Playbook" as structured data with 13 tools for reference, guided analysis, and workflow navigation.

**Architecture:** Hybrid approach — structured reference data (frameworks, workflows, recipes) + analysis templates that Claude fills in from real data (transcripts, surveys). No LLM calls in the server. All content embedded as TypeScript constants. Substring search across all content types.

**Tech Stack:** TypeScript, `@modelcontextprotocol/server` (MCP SDK), `zod/v4`, stdio transport

**Source data:** `book-power/books/analysis-moesta-demand-side-sales.md` and `book-power/books/analysis-kalbach-jtbd-playbook.md`

**Design doc:** `book-power/docs/plans/2026-03-07-jtbd-mcp-server-design.md`

---

### Task 1: Project Scaffold

**Files:**
- Create: `book-power-output/mcp/jtbd-knowledge/package.json`
- Create: `book-power-output/mcp/jtbd-knowledge/tsconfig.json`
- Create: `book-power-output/mcp/jtbd-knowledge/.gitignore`

**Step 1: Create output directory and package.json**

```json
{
  "name": "mcp-jtbd-knowledge",
  "version": "0.1.0",
  "description": "JTBD methodology MCP server — Moesta + Kalbach",
  "type": "module",
  "bin": {
    "mcp-jtbd-knowledge": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx src/index.ts"
  },
  "dependencies": {
    "@modelcontextprotocol/server": "^0.10.0",
    "zod": "^3.25.0"
  },
  "devDependencies": {
    "tsx": "^4.19.0",
    "typescript": "^5.3.0",
    "@types/node": "^22.0.0"
  },
  "license": "UNLICENSED"
}
```

Note: Check exact latest version of `@modelcontextprotocol/server` on npm before installing. The package was recently renamed from `@modelcontextprotocol/sdk`.

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 3: Create .gitignore**

```
node_modules/
dist/
```

**Step 4: Run npm install**

Run: `cd book-power-output/mcp/jtbd-knowledge && npm install`
Expected: Dependencies installed, node_modules created

---

### Task 2: Type Definitions

**Files:**
- Create: `book-power-output/mcp/jtbd-knowledge/src/types.ts`

**Step 1: Write all type interfaces**

```typescript
export interface Book {
  id: string;
  title: string;
  author: string;
  year: number;
}

export interface Framework {
  id: string;
  name: string;
  bookId: string;
  chapter: string;
  description: string;
  elements: FrameworkElement[];
  diagram?: string;
}

export interface FrameworkElement {
  name: string;
  description: string;
}

export interface Workflow {
  id: string;
  name: string;
  bookId: string;
  chapter: string;
  description: string;
  steps: WorkflowStep[];
  inputs: string[];
  outputs: string[];
  relatedFrameworks: string[];
}

export interface WorkflowStep {
  number: number;
  action: string;
  details: string;
  tips?: string[];
}

export interface Recipe {
  id: string;
  name: string;
  bookId: string;
  goal: string;
  workflowSequence: string[];
  description: string;
}

export interface InterviewQuestion {
  category: string;
  question: string;
  bookId: string;
  probingTips?: string[];
}

export interface InterviewTechnique {
  id: string;
  name: string;
  bookId: string;
  description: string;
  example?: string;
}

export interface Template {
  id: string;
  name: string;
  bookId: string;
  format: string;
  example?: string;
  usage: string;
}

export interface AnalysisTemplate {
  id: string;
  name: string;
  purpose: string;
  inputDescription: string;
  instructions: string;
  outputSchema: string;
  frameworksUsed: string[];
}

export interface Concept {
  name: string;
  definition: string;
  bookId: string;
  relatedConcepts?: string[];
}

export interface Quote {
  text: string;
  attribution: string;
  bookId: string;
  chapter: string;
  topicTags: string[];
}

export interface SearchResult {
  type: 'framework' | 'workflow' | 'recipe' | 'concept' | 'quote' | 'template' | 'technique';
  id: string;
  name: string;
  excerpt: string;
  bookId: string;
}
```

---

### Task 3: Data — Books and Frameworks

**Files:**
- Create: `book-power-output/mcp/jtbd-knowledge/src/data/books.ts`
- Create: `book-power-output/mcp/jtbd-knowledge/src/data/frameworks.ts`

**Source:** Read `book-power/books/analysis-moesta-demand-side-sales.md` sections 2 (Key Frameworks) and `book-power/books/analysis-kalbach-jtbd-playbook.md` section 2 (Key Frameworks).

**Step 1: Create books.ts**

```typescript
import type { Book } from '../types.js';

export const BOOKS: Book[] = [
  {
    id: 'moesta',
    title: 'Demand-Side Sales 101',
    author: 'Bob Moesta',
    year: 2020,
  },
  {
    id: 'kalbach',
    title: 'The Jobs To Be Done Playbook',
    author: 'Jim Kalbach',
    year: 2020,
  },
];
```

**Step 2: Create frameworks.ts**

Populate ALL frameworks from both analysis files. Each framework needs: id, name, bookId, chapter, description, elements (with name + description for each), optional diagram.

Example entries to show the pattern:

```typescript
import type { Framework } from '../types.js';

export const FRAMEWORKS: Framework[] = [
  // === MOESTA ===
  {
    id: 'four-forces-moesta',
    name: 'Four Forces of Progress',
    bookId: 'moesta',
    chapter: 'Chapter 2',
    description: 'Four forces determine whether someone switches from their current solution to a new one. For a switch to happen, the combined Push + Pull must exceed the combined Anxiety + Habit.',
    elements: [
      { name: 'Push of the situation', description: 'Frustration/problems with current situation pushing them away' },
      { name: 'Pull/Magnetism of the new solution', description: 'Attraction toward a new, better way' },
      { name: 'Anxiety of the new solution', description: 'Fear/uncertainty about the unknown new thing' },
      { name: 'Habit of the present', description: 'Comfort with the status quo, "the devil you know"' },
    ],
    diagram: 'Push + Pull > Anxiety + Habit → Switch happens',
  },
  {
    id: 'jtbd-timeline',
    name: 'JTBD Timeline (Buyer\'s Timeline)',
    bookId: 'moesta',
    chapter: 'Chapter 2',
    description: 'A six-phase sequence that maps how people actually buy (not how sellers sell).',
    elements: [
      { name: 'First Thought', description: 'Admitting there\'s a problem; a question forms in the brain' },
      { name: 'Passive Looking', description: 'Aware of the problem, noticing possible solutions, not yet acting' },
      { name: 'Active Looking', description: 'Deliberately searching, framing tradeoffs, building ideal solution target' },
      { name: 'Deciding', description: 'Making tradeoffs, setting expectations; requires a "time wall"' },
      { name: 'Onboarding', description: 'First use, measuring whether expectations are met' },
      { name: 'Ongoing Use', description: 'Building new habits, discovering new struggling moments' },
    ],
  },
  // ... populate ALL 11 Moesta frameworks and ALL 12 Kalbach frameworks
  // from the analysis files
];
```

Read the full analysis files and populate every framework. Total: ~23 frameworks.

---

### Task 4: Data — Workflows

**Files:**
- Create: `book-power-output/mcp/jtbd-knowledge/src/data/workflows.ts`

**Source:** Read analysis files section 3 (Practical Workflows) from both books.

**Step 1: Create workflows.ts**

Populate ALL workflows. Each needs: id, name, bookId, chapter, description, steps (numbered with action + details + tips), inputs, outputs, relatedFrameworks.

Example:

```typescript
import type { Workflow } from '../types.js';

export const WORKFLOWS: Workflow[] = [
  {
    id: 'conduct-jtbd-interview',
    name: 'Conduct a JTBD Interview',
    bookId: 'moesta',
    chapter: 'Chapters 3-4',
    description: 'How to interview real buyers to understand the circumstance and outcome that caused a purchase.',
    inputs: ['Recent buyer/switcher to interview', 'Recording setup', 'Interview partner (pairs recommended)'],
    outputs: ['Buyer timeline map', 'Four forces diagram', 'Triggering events', 'Struggling moments'],
    relatedFrameworks: ['four-forces-moesta', 'jtbd-timeline', 'three-sources-of-energy'],
    steps: [
      {
        number: 1,
        action: 'Setup and framing',
        details: 'Explain purpose: "We\'re trying to understand the language people use when they talk about [domain]." Frame as documentary: "Imagine I\'m shooting a documentary." State: "No right or wrong answers."',
      },
      {
        number: 2,
        action: 'Get background',
        details: 'Ask about them, their family, their work. Get first names of people involved.',
      },
      {
        number: 3,
        action: 'Find the first thought',
        details: '"At some point, something happened that made you say, \'Today\'s the day.\' Tell us about that."',
      },
      {
        number: 4,
        action: 'Build the timeline backward',
        details: 'Start from the purchase and trace back through events.',
      },
      {
        number: 5,
        action: 'Unpack every vague word',
        details: 'When they say "easy," "good," "fast," stop and drill: "What does that mean?"',
        tips: ['Ask: "What does that mean?"', '"Give me an example of that. Give me an example of not that."'],
      },
      {
        number: 6,
        action: 'Listen for energy',
        details: 'Accentuated words, sighs, pauses, emotional intonation. When you hear it: "Wait, tell me more about that."',
      },
      {
        number: 7,
        action: 'Get cinematic details',
        details: '"Where were you? What time was it? Who was with you?"',
      },
      {
        number: 8,
        action: 'Map the forces',
        details: 'Identify pushes, pulls, anxieties, habits from the story.',
      },
      {
        number: 9,
        action: 'Identify triggering events',
        details: 'What moved them from passive to active looking? From active looking to deciding?',
      },
      {
        number: 10,
        action: 'Play the story back wrong',
        details: 'Intentionally restate slightly incorrectly to get them to correct you with better language.',
      },
    ],
  },
  // ... populate ALL 4 Moesta workflows and ALL 13 Kalbach workflows
];
```

Total: ~17 workflows.

---

### Task 5: Data — Recipes, Interview Questions, Techniques

**Files:**
- Create: `book-power-output/mcp/jtbd-knowledge/src/data/recipes.ts`
- Create: `book-power-output/mcp/jtbd-knowledge/src/data/interviews.ts`
- Create: `book-power-output/mcp/jtbd-knowledge/src/data/techniques.ts`

**Step 1: Create recipes.ts**

Source: Kalbach analysis section 8 (Recipes). 5 recipes, each with workflow sequence.

```typescript
import type { Recipe } from '../types.js';

export const RECIPES: Recipe[] = [
  {
    id: 'launch-new-product',
    name: 'Launch a New Product',
    bookId: 'kalbach',
    goal: 'Discover unmet needs and build a product that targets them',
    description: 'Full discovery-to-launch flow using JTBD methodology.',
    workflowSequence: [
      'conduct-jobs-interviews',
      'create-job-map',
      'find-underserved-needs-odi',
      'define-value-proposition',
      'test-assumptions',
    ],
  },
  {
    id: 'optimize-existing-product',
    name: 'Optimize an Existing Product',
    bookId: 'kalbach',
    goal: 'Improve an existing product based on real job performer needs',
    description: 'Compare your solution against alternatives, map the consumption journey, and prioritize improvements.',
    workflowSequence: [
      'conduct-jobs-interviews',
      'compare-competing-solutions',
      'consumption-journey-map',
      'create-job-stories',
      'create-development-roadmap',
    ],
  },
  {
    id: 'increase-demand',
    name: 'Increase Demand',
    bookId: 'kalbach',
    goal: 'Understand why people switch and reduce barriers to adoption',
    description: 'Focus on the switching behavior — what pushes people away from current solutions and pulls them toward yours.',
    workflowSequence: [
      'run-switch-interviews',
      'four-forces-analysis',
      'create-job-stories',
      'create-development-roadmap',
    ],
  },
  {
    id: 'make-customers-successful',
    name: 'Make Customers Successful Over Time',
    bookId: 'kalbach',
    goal: 'Improve onboarding, retention, and ongoing support',
    description: 'Map the full consumption journey and optimize each stage for customer success.',
    workflowSequence: [
      'conduct-jobs-interviews',
      'create-job-map',
      'onboarding-design',
      'retention-analysis',
      'support-optimization',
    ],
  },
  {
    id: 'build-innovation-strategy',
    name: 'Build Corporate Innovation Strategy',
    bookId: 'kalbach',
    goal: 'Align innovation efforts around jobs, not products',
    description: 'Use JTBD to identify strategic opportunities and organize teams around customer jobs.',
    workflowSequence: [
      'conduct-jobs-interviews',
      'create-job-map',
      'find-underserved-needs-odi',
      'jtbd-based-strategy',
      'organize-around-jobs',
    ],
  },
];
```

**Step 2: Create interviews.ts**

Source: Both analysis files — section 5 (Interview Techniques) and interview questions.

```typescript
import type { InterviewQuestion } from '../types.js';

export const INTERVIEW_QUESTIONS: InterviewQuestion[] = [
  // === JOBS INTERVIEW QUESTIONS (Kalbach Ch 3) ===
  { category: 'background', question: 'Tell me about yourself. When did you last do [the main job]? How did you feel?', bookId: 'kalbach' },
  { category: 'main-job', question: 'What are you trying to accomplish?', bookId: 'kalbach' },
  { category: 'main-job', question: 'What problems are you preventing?', bookId: 'kalbach' },
  { category: 'main-job', question: 'What would the ideal service be?', bookId: 'kalbach' },
  { category: 'process', question: 'How do you get started?', bookId: 'kalbach' },
  { category: 'process', question: 'What\'s the next step?', bookId: 'kalbach' },
  { category: 'process', question: 'How do you make decisions?', bookId: 'kalbach' },
  { category: 'process', question: 'How do you know you\'re doing it right?', bookId: 'kalbach' },
  { category: 'needs', question: 'What workarounds exist?', bookId: 'kalbach' },
  { category: 'needs', question: 'What do you dread?', bookId: 'kalbach' },
  { category: 'needs', question: 'What could be easier?', bookId: 'kalbach' },
  { category: 'needs', question: 'What\'s the most annoying part?', bookId: 'kalbach' },
  { category: 'circumstances', question: 'In which situations do you act differently?', bookId: 'kalbach' },
  { category: 'circumstances', question: 'What conditions influence decisions?', bookId: 'kalbach' },
  // === SWITCH INTERVIEW QUESTIONS (Moesta Ch 3-4) ===
  { category: 'first-thought', question: 'At some point, something happened that made you say, "Today\'s the day." Tell us about that.', bookId: 'moesta' },
  { category: 'timeline', question: 'What happened before that?', bookId: 'moesta', probingTips: ['Work backward from purchase to first thought'] },
  { category: 'timeline', question: 'Why did you make that decision?', bookId: 'moesta' },
  // === FORCES QUESTIONS (Moesta Appendix Tool 1) ===
  { category: 'push', question: 'What are you struggling with?', bookId: 'moesta' },
  { category: 'push', question: 'What\'s not happening that you want?', bookId: 'moesta' },
  { category: 'push', question: 'Why now?', bookId: 'moesta' },
  { category: 'pull', question: 'What are you hoping for?', bookId: 'moesta' },
  { category: 'pull', question: 'What will be different?', bookId: 'moesta' },
  { category: 'anxiety', question: 'What are you worried about?', bookId: 'moesta' },
  { category: 'anxiety', question: 'What\'s your greatest concern?', bookId: 'moesta' },
  { category: 'habit', question: 'What do you love about your current solution?', bookId: 'moesta' },
  { category: 'habit', question: 'What aren\'t you willing to give up?', bookId: 'moesta' },
  { category: 'time-wall', question: 'When do you need to decide by?', bookId: 'moesta' },
  { category: 'time-wall', question: 'Why then?', bookId: 'moesta' },
  // === CANCELLATION INTERVIEW (Kalbach Ch 6) ===
  { category: 'cancellation', question: 'When did you first think about cancelling?', bookId: 'kalbach', probingTips: ['Use inverted Switch timeline — work backward from cancellation'] },
];
```

**Step 3: Create techniques.ts**

Source: Both analysis files, interview technique sections.

```typescript
import type { InterviewTechnique } from '../types.js';

export const INTERVIEW_TECHNIQUES: InterviewTechnique[] = [
  {
    id: 'unpack-vague-words',
    name: 'Unpack Vague Words',
    bookId: 'moesta',
    description: 'When someone uses abstract language ("easy", "fast", "convenient"), stop and drill into what they actually mean.',
    example: '"What does [easy/fast/convenient] mean?" → "Tell me what that is. Tell me what that is not." → "Give me an example of that. Give me an example of not that."',
  },
  {
    id: 'play-it-back-wrong',
    name: 'Play It Back Wrong',
    bookId: 'moesta',
    description: 'Intentionally restate what they said slightly incorrectly. People will correct you with better, more precise language than they originally used.',
    example: 'If they say "I wanted something faster", say "So you wanted the cheapest option?" — they\'ll correct you and reveal the real criteria.',
  },
  {
    id: 'cinematic-details',
    name: 'Get Cinematic Details',
    bookId: 'moesta',
    description: 'Ask for specific sensory details to trigger memory recall and get past rationalized explanations.',
    example: '"Where were you? What time was it? Who was with you? What were you wearing?"',
  },
  {
    id: 'listen-for-energy',
    name: 'Listen for Energy',
    bookId: 'moesta',
    description: 'Pay attention to HOW things are said — accentuated words, sighs, pauses, emotional intonation. When you hear energy, stop everything and probe deeper.',
    example: 'When you hear a sigh or emphasis: "Wait, tell me more about that."',
  },
  {
    id: 'shoot-documentary',
    name: 'Shoot the Documentary',
    bookId: 'moesta',
    description: 'Frame the interview as a documentary. Gets people into storytelling mode instead of giving you rationalized answers.',
    example: '"Imagine I\'m shooting a documentary and trying to understand why you [bought/switched/chose]. Take me through what happened."',
  },
  {
    id: 'play-dumb',
    name: 'Play Dumb',
    bookId: 'moesta',
    description: 'Say "I\'m confused" as a key phrase. Makes them explain more clearly without feeling judged.',
  },
  {
    id: 'good-cop-bad-cop',
    name: 'Good Cop, Bad Cop',
    bookId: 'moesta',
    description: 'Interview in pairs. Argue with each other, never the interviewee. This makes the interviewee feel safe while still probing deeply.',
  },
  {
    id: 'use-first-names',
    name: 'Use First Names',
    bookId: 'moesta',
    description: 'Get first names of people in their story. Using "Kyle" instead of "your husband" builds familiarity and makes the story more concrete.',
  },
  {
    id: 'use-analogies',
    name: 'Use Analogies',
    bookId: 'moesta',
    description: 'When someone can\'t express themselves, ask for comparisons. "Is it more like X or Y?"',
  },
  {
    id: 'critical-incident',
    name: 'Critical Incident Technique',
    bookId: 'kalbach',
    description: 'Ask someone to recall a specific incident when the job went particularly wrong. Then discuss the ideal state.',
    example: '1. Recall a specific incident (when it went wrong) → 2. Describe the experience → 3. Discuss the ideal state',
  },
  {
    id: 'laddering',
    name: 'Laddering (Why/How)',
    bookId: 'kalbach',
    description: 'Move up the goal hierarchy with "Why?" and down with "How?". Helps find the right level of abstraction for the job.',
    example: '"Why do you need to do that?" (goes up to aspirations) / "How do you do that?" (goes down to micro-jobs)',
  },
];
```

---

### Task 6: Data — Templates, Concepts, Quotes

**Files:**
- Create: `book-power-output/mcp/jtbd-knowledge/src/data/templates.ts`
- Create: `book-power-output/mcp/jtbd-knowledge/src/data/concepts.ts`
- Create: `book-power-output/mcp/jtbd-knowledge/src/data/quotes.ts`

**Step 1: Create templates.ts**

Source: Both analysis files section 6 (Templates and Artifacts).

```typescript
import type { Template } from '../types.js';

export const TEMPLATES: Template[] = [
  {
    id: 'job-statement',
    name: 'Job Statement',
    bookId: 'kalbach',
    format: '[Verb] + [object of the verb] + [contextual clarifier]',
    example: '"Arrange transportation to visit family on special occasions"',
    usage: 'Rules: Start with verb, no methods/technology, stable over time, no preferences, no compounds.',
  },
  {
    id: 'desired-outcome',
    name: 'Desired Outcome Statement',
    bookId: 'kalbach',
    format: '[Direction of change] + [unit of measure] + [object] + [contextual clarifier]',
    example: '"Minimize the time it takes to arrange transportation when visiting family"',
    usage: 'Used in ODI scoring. Direction: minimize/increase. Unit: time, likelihood, effort, cost. 50-150 per job.',
  },
  {
    id: 'job-story',
    name: 'Job Story',
    bookId: 'kalbach',
    format: 'When I [circumstance + job stage], I want to [micro-job], so I can [need]',
    example: '"When I am confirming my travel plans for a family visit, I want to verify the departure time, so I can minimize the likelihood of arriving late"',
    usage: 'Alternative to user stories. Focuses on situation and motivation rather than persona.',
  },
  {
    id: 'value-proposition',
    name: 'Value Proposition Statement',
    bookId: 'kalbach',
    format: 'For [performers] who are dissatisfied with [alternative], our solution is a [product] that provides [capability], unlike [alternative]',
    example: '"For busy parents who are dissatisfied with coordinating rides via phone calls, our app provides one-tap ride scheduling, unlike traditional taxi dispatch"',
    usage: 'Derived from competitive comparison + underserved needs analysis.',
  },
  {
    id: 'forces-diagram',
    name: 'Forces Diagram',
    bookId: 'moesta',
    format: '2x2 quadrant:\n  Top-left: PUSH (problems with current situation)\n  Top-right: PULL (attraction of new solution)\n  Bottom-left: HABIT (comfort with status quo)\n  Bottom-right: ANXIETY (fear of new solution)\n\nSwitch happens when Push + Pull > Anxiety + Habit',
    usage: 'Fill in each quadrant from interview data. Look for the balance — which force dominates?',
  },
  {
    id: 'buyers-timeline',
    name: 'Buyer\'s Timeline Map',
    bookId: 'moesta',
    format: 'Horizontal timeline:\n  First Thought → Passive Looking → Active Looking → Deciding → Onboarding → Ongoing Use\n\nAt each phase, document:\n  - Four forces (push, pull, anxiety, habit)\n  - Three motivations (functional, emotional, social)\n  - Triggering event to next phase',
    usage: 'Map each customer interview across all six phases.',
  },
  {
    id: 'jtbd-canvas',
    name: 'JTBD Canvas',
    bookId: 'kalbach',
    format: 'Columns: Performer | Main Job | Related Jobs | Emotional/Social Jobs | Process | Needs | Circumstances',
    usage: 'One-page summary of JTBD research findings. Fill from interview analysis.',
  },
  {
    id: 'interview-analysis-spreadsheet',
    name: 'Interview Analysis Spreadsheet',
    bookId: 'kalbach',
    format: 'Columns: Raw quote/observation | Micro-jobs | Emotional/Social aspects | Needs | Circumstances',
    usage: 'Process each interview into structured data. One row per insight.',
  },
  {
    id: 'jobs-scoring-sheet',
    name: 'Jobs Scoring Sheet',
    bookId: 'kalbach',
    format: 'Columns: JTBD | Importance (1-10) | Frequency | Frustration | Score | Rank',
    usage: 'Prioritize which jobs to focus on.',
  },
  {
    id: 'recruiting-screener',
    name: 'Recruiting Screener',
    bookId: 'kalbach',
    format: 'Sections: Introduction | Questionnaire with exclusion criteria | Schedule',
    usage: 'Screen interview participants. Recruit 10-12 for confidence, 20+ for quantitative patterns.',
  },
  {
    id: 'disruption-diagnostic',
    name: 'Disruption Diagnostic Canvas',
    bookId: 'kalbach',
    format: 'Three sections: Disruptor\'s jobs they serve | Your company\'s advantages | Barriers to disruption',
    usage: 'Evaluate threat from potential disruptors using JTBD lens.',
  },
];
```

**Step 2: Create concepts.ts**

Source: Both analysis files section 4 (Key Concepts). Deduplicate where both books define the same concept.

```typescript
import type { Concept } from '../types.js';

export const CONCEPTS: Concept[] = [
  // Populate ALL concepts from both analysis files
  // ~28 concepts total, deduplicated
  { name: 'Job to Be Done', definition: 'A goal or objective a person is trying to accomplish, independent of any solution.', bookId: 'kalbach', relatedConcepts: ['Main Job', 'Related Jobs'] },
  { name: 'Struggling Moment', definition: 'The seed for all new sales. A moment when someone realizes their current situation isn\'t working.', bookId: 'moesta', relatedConcepts: ['First Thought', 'Push'] },
  { name: 'Progress', definition: 'What the buyer is trying to achieve. Not defined by features but by desired outcome.', bookId: 'moesta', relatedConcepts: ['Job to Be Done', 'Desired Outcome Statement'] },
  { name: 'Hiring and Firing', definition: 'The metaphor for buying and switching. Customers "hire" a product to do a job and "fire" products that fail.', bookId: 'moesta', relatedConcepts: ['Little Hires', 'Big Hires'] },
  { name: 'Time Wall', definition: 'A deadline or pressure that forces the buyer from "looking" to "deciding." Without a time wall, most people will not make a purchase.', bookId: 'moesta' },
  { name: 'Job Map', definition: 'Chronological diagram of stages in getting a job done — NOT a customer journey map. Shows the process, not the experience with your solution.', bookId: 'kalbach', relatedConcepts: ['Universal Job Map'] },
  { name: 'Underserved Needs', definition: 'Important but not well satisfied by current solutions. High opportunity score in ODI.', bookId: 'kalbach', relatedConcepts: ['Overserved Needs', 'ODI'] },
  { name: 'Overserved Needs', definition: 'Well-satisfied but not important — opportunity for disruption by cheaper alternatives.', bookId: 'kalbach', relatedConcepts: ['Underserved Needs', 'Disruption'] },
  // ... populate remaining from analysis files
];
```

**Step 3: Create quotes.ts**

Source: Both analysis files section 7/9 (Key Quotes). 14 from each book.

```typescript
import type { Quote } from '../types.js';

export const QUOTES: Quote[] = [
  // Populate ALL 28 quotes from both analysis files
  // Each with text, attribution, bookId, chapter, topicTags
  { text: 'People don\'t buy products; they hire them to make progress in their lives.', attribution: 'Bob Moesta', bookId: 'moesta', chapter: 'Chapter 2', topicTags: ['jtbd-core', 'hiring-firing'] },
  { text: 'The struggling moment is the seed for all new sales.', attribution: 'Bob Moesta', bookId: 'moesta', chapter: 'Chapter 1', topicTags: ['struggling-moment', 'demand'] },
  { text: 'A job map is not a customer journey map.', attribution: 'Jim Kalbach', bookId: 'kalbach', chapter: 'Chapter 2', topicTags: ['job-map', 'process'] },
  // ... populate remaining
];
```

---

### Task 7: Data — Analysis Templates

**Files:**
- Create: `book-power-output/mcp/jtbd-knowledge/src/data/analysis-templates.ts`

These are the "guided analysis" prompts — structured instructions for Claude to follow when analyzing real data (transcripts, surveys). This is NEW content synthesized from the books' methodology.

```typescript
import type { AnalysisTemplate } from '../types.js';

export const ANALYSIS_TEMPLATES: AnalysisTemplate[] = [
  {
    id: 'forces-analysis',
    name: 'Four Forces Analysis',
    purpose: 'Extract the four forces of progress from an interview transcript or user feedback.',
    inputDescription: 'Interview transcript, user feedback, or conversation notes where someone describes switching (or considering switching) from one solution to another.',
    instructions: `Analyze the provided text and extract the Four Forces of Progress:

1. **PUSH (Problems with current situation)**
   - What frustrations, pain points, or problems are pushing them away from their current solution?
   - Look for: complaints, workarounds, "I was tired of...", "It was frustrating that..."

2. **PULL (Attraction of new solution)**
   - What is attracting them toward something new?
   - Look for: aspirations, hopes, "I wanted...", "I imagined...", "I saw [someone] using..."

3. **ANXIETY (Fear of the new)**
   - What fears or uncertainties are they expressing about switching?
   - Look for: "What if...", "I wasn't sure...", "I was worried about...", hesitation

4. **HABIT (Comfort with status quo)**
   - What keeps them attached to their current way?
   - Look for: "I'm used to...", "At least I know...", familiarity, sunk costs

For each force, extract:
- Direct quotes from the text
- The underlying functional, emotional, and social motivations
- Relative strength (strong/moderate/weak)

Then assess: Does Push + Pull outweigh Anxiety + Habit? What would tip the balance?`,
    outputSchema: `{
  push: [{ quote: string, motivation: "functional"|"emotional"|"social", strength: "strong"|"moderate"|"weak" }],
  pull: [{ quote: string, motivation: string, strength: string }],
  anxiety: [{ quote: string, motivation: string, strength: string }],
  habit: [{ quote: string, motivation: string, strength: string }],
  balance: string,
  recommendation: string
}`,
    frameworksUsed: ['four-forces-moesta', 'three-sources-of-energy'],
  },
  {
    id: 'timeline-extraction',
    name: 'Buyer\'s Timeline Extraction',
    purpose: 'Map a buyer\'s journey across the six JTBD timeline phases from an interview transcript.',
    inputDescription: 'Interview transcript where someone describes their buying/switching journey, ideally from a Switch interview.',
    instructions: `Map the buyer's journey across the six phases of the JTBD Timeline:

1. **First Thought** — When did they first admit there was a problem? What triggered it?
   - Look for the earliest moment of dissatisfaction
   - "When did you first think about changing?"

2. **Passive Looking** — How long were they aware but not acting? What were they noticing?
   - Look for: noticing ads, hearing from friends, casual browsing
   - Note the duration of this phase

3. **Active Looking** — What triggered the shift to deliberate search? What options did they explore?
   - Look for: specific searches, comparisons, asking for recommendations
   - What was their "ideal solution" picture?

4. **Deciding** — What was the time wall? What tradeoffs did they make?
   - Look for: deadlines, events, external pressure
   - What did they give up? What was non-negotiable?

5. **Onboarding** — What were their expectations? Were they met?
   - First use experience
   - Surprises (positive or negative)

6. **Ongoing Use** — What new habits formed? What new struggling moments emerged?
   - Look for: adaptation, new workflows, new complaints

For each phase, note:
- The triggering event that moved them to the next phase
- Key quotes
- Functional, emotional, and social factors`,
    outputSchema: `{
  phases: [{
    phase: string,
    timeframe: string,
    triggerToNextPhase: string,
    keyQuotes: string[],
    functionalFactors: string[],
    emotionalFactors: string[],
    socialFactors: string[]
  }],
  totalJourneyDuration: string,
  criticalMoments: string[]
}`,
    frameworksUsed: ['jtbd-timeline', 'three-sources-of-energy', 'four-forces-moesta'],
  },
  {
    id: 'job-map-construction',
    name: 'Job Map Construction',
    purpose: 'Build a Universal Job Map (8 stages) from interview data.',
    inputDescription: 'Multiple interview transcripts or extracted micro-jobs from interview analysis.',
    instructions: `Construct a Universal Job Map using Kalbach's 8-stage structure:

1. **Define** — How do they determine objectives and plan?
2. **Locate** — How do they gather materials and information?
3. **Prepare** — How do they organize materials and create setup?
4. **Confirm** — How do they ensure readiness?
5. **Execute** — How do they perform the core job?
6. **Monitor** — How do they evaluate success during execution?
7. **Modify** — How do they iterate as necessary?
8. **Conclude** — How do they end the job and follow up?

For each stage:
- Extract micro-jobs (task-level activities) from the interview data
- Identify needs (desired outcomes) at each stage
- Note pain points and workarounds
- Flag emotional/social aspects

Start with three large phases (beginning, middle, end), then refine into the 8 stages. Label stages with single-word verbs. Validate that the map is solution-agnostic — it should describe the job, not your product.`,
    outputSchema: `{
  mainJob: string,
  stages: [{
    name: string,
    verb: string,
    microJobs: string[],
    needs: string[],
    painPoints: string[],
    emotionalAspects: string[]
  }]
}`,
    frameworksUsed: ['universal-job-map', 'jtbd-hierarchy'],
  },
  {
    id: 'odi-scoring',
    name: 'ODI Opportunity Scoring',
    purpose: 'Calculate opportunity scores for desired outcomes to find underserved needs.',
    inputDescription: 'List of desired outcome statements with importance (1-10) and satisfaction (1-10) ratings from survey data.',
    instructions: `Apply Outcome-Driven Innovation (ODI) scoring:

1. For each desired outcome statement, you need two survey metrics:
   - **Importance** (1-10): How important is this outcome to job performers?
   - **Satisfaction** (1-10): How well do current solutions satisfy this outcome?

2. Calculate the **Opportunity Score**:
   Formula: Importance + max(Importance - Satisfaction, 0)
   Range: 0-20
   Higher = bigger opportunity

3. Classify each outcome:
   - **Underserved** (score > 12): Important but not well satisfied — HIGH opportunity
   - **Appropriately served** (score 8-12): Reasonably balanced
   - **Overserved** (score < 8): Well satisfied but not important — disruption opportunity

4. Plot on Importance vs. Satisfaction graph:
   - Top-left quadrant = underserved (target these)
   - Bottom-right quadrant = overserved (disruptors target these)

5. Prioritize the top 5-10 underserved outcomes for product development.

Note: Minimum 150 survey respondents for statistical confidence.`,
    outputSchema: `{
  outcomes: [{
    statement: string,
    importance: number,
    satisfaction: number,
    opportunityScore: number,
    classification: "underserved"|"appropriately-served"|"overserved"
  }],
  topOpportunities: string[],
  disruptionRisks: string[]
}`,
    frameworksUsed: ['odi-scoring', 'importance-satisfaction-matrix'],
  },
  {
    id: 'persona-building',
    name: 'Goal-Based Persona Construction',
    purpose: 'Create JTBD-based personas from interview data — based on goals and circumstances, not demographics.',
    inputDescription: 'Data from 12+ interviews including goals, behaviors, circumstances, and frustrations.',
    instructions: `Build Goal-Based Personas following Kalbach's method:

1. **Map behavior variables** — For each interviewee, plot them on ranges:
   - Frequency of job execution (daily → yearly)
   - Expertise level (novice → expert)
   - Primary motivation (functional → emotional → social)
   - Risk tolerance (risk-averse → risk-seeking)
   - Decision-making style (analytical → intuitive)
   Add any domain-specific variables relevant to the job.

2. **Find clusters** — Look for patterns where multiple variables cluster together.
   - Groups of people who share similar goals AND similar circumstances
   - These clusters become personas

3. **Describe each persona:**
   - Name (descriptive, not demographic)
   - Goals (what job are they trying to get done?)
   - Circumstances (when, where, how do they encounter the job?)
   - Frustrations (what's not working with current solutions?)
   - Minimal demographics (only if causally relevant)

Key principle: Personas are defined by GOALS and CIRCUMSTANCES, not by age/gender/income. Two people with identical demographics may have completely different jobs.`,
    outputSchema: `{
  behaviorVariables: [{ name: string, range: [string, string] }],
  personas: [{
    name: string,
    goals: string[],
    circumstances: string[],
    frustrations: string[],
    currentSolutions: string[],
    demographics: string
  }]
}`,
    frameworksUsed: ['jtbd-framework-5-elements', 'jtbd-hierarchy'],
  },
  {
    id: 'competing-solutions',
    name: 'Competing Solutions Analysis',
    purpose: 'Map how different solutions serve the same job and find your opportunity.',
    inputDescription: 'A defined job + list of all solutions people currently use to get that job done (including non-obvious competitors like manual processes, spreadsheets, asking a friend, etc.)',
    instructions: `Analyze competing solutions following Kalbach's method:

1. **List ALL means** by which people currently get the job done
   - Include direct competitors, adjacent solutions, manual processes, workarounds
   - Remember: "The greatest competitor to tax software was the pencil" (Scott Cook)
   - Think about hiring/firing: what did people fire when they hired each solution?

2. **Select needs or job steps to compare**
   - Use the job map stages or desired outcome statements as comparison dimensions
   - Pick 8-12 dimensions that matter most to job performers

3. **Rank how well each solution meets those needs**
   - Use a simple scale (poor / adequate / good / excellent)
   - Be honest about your own solution's weaknesses

4. **Find your sweet spot**
   - Where are you uniquely better?
   - Where are you worse but it doesn't matter (overserved needs)?
   - Where is no one doing well (underserved needs)?

5. **Apply Growth Strategy Matrix** — Which strategy fits?
   - Differentiated: Better + more expensive
   - Dominant: Better + less expensive
   - Discrete: Serves limited-option customers
   - Disruptive: Worse + less expensive (but improving)
   - Sustaining: Slightly better or cheaper`,
    outputSchema: `{
  job: string,
  solutions: [{ name: string, type: string }],
  comparisonDimensions: string[],
  matrix: [{ solution: string, ratings: { [dimension: string]: string } }],
  sweetSpot: string,
  strategyFit: string
}`,
    frameworksUsed: ['growth-strategy-matrix', 'value-proposition-canvas'],
  },
];
```

---

### Task 8: Data Index

**Files:**
- Create: `book-power-output/mcp/jtbd-knowledge/src/data/index.ts`

Re-export everything for clean imports.

```typescript
export { BOOKS } from './books.js';
export { FRAMEWORKS } from './frameworks.js';
export { WORKFLOWS } from './workflows.js';
export { RECIPES } from './recipes.js';
export { INTERVIEW_QUESTIONS } from './interviews.js';
export { INTERVIEW_TECHNIQUES } from './techniques.js';
export { TEMPLATES } from './templates.js';
export { ANALYSIS_TEMPLATES } from './analysis-templates.js';
export { CONCEPTS } from './concepts.js';
export { QUOTES } from './quotes.js';
```

---

### Task 9: Search Module

**Files:**
- Create: `book-power-output/mcp/jtbd-knowledge/src/search.ts`

Case-insensitive substring search across all content types.

```typescript
import type { SearchResult } from './types.js';
import {
  FRAMEWORKS, WORKFLOWS, RECIPES, CONCEPTS,
  QUOTES, TEMPLATES, INTERVIEW_TECHNIQUES,
} from './data/index.js';

export function searchAll(query: string, maxResults: number = 10): SearchResult[] {
  const q = query.toLowerCase();
  const results: SearchResult[] = [];

  for (const f of FRAMEWORKS) {
    const searchable = `${f.name} ${f.description} ${f.elements.map(e => `${e.name} ${e.description}`).join(' ')}`.toLowerCase();
    if (searchable.includes(q)) {
      results.push({ type: 'framework', id: f.id, name: f.name, excerpt: f.description, bookId: f.bookId });
    }
  }

  for (const w of WORKFLOWS) {
    const searchable = `${w.name} ${w.description} ${w.steps.map(s => `${s.action} ${s.details}`).join(' ')}`.toLowerCase();
    if (searchable.includes(q)) {
      results.push({ type: 'workflow', id: w.id, name: w.name, excerpt: w.description, bookId: w.bookId });
    }
  }

  for (const r of RECIPES) {
    const searchable = `${r.name} ${r.goal} ${r.description}`.toLowerCase();
    if (searchable.includes(q)) {
      results.push({ type: 'recipe', id: r.id, name: r.name, excerpt: r.goal, bookId: r.bookId });
    }
  }

  for (const c of CONCEPTS) {
    const searchable = `${c.name} ${c.definition}`.toLowerCase();
    if (searchable.includes(q)) {
      results.push({ type: 'concept', id: c.name, name: c.name, excerpt: c.definition, bookId: c.bookId });
    }
  }

  for (const q2 of QUOTES) {
    const searchable = `${q2.text} ${q2.attribution} ${q2.topicTags.join(' ')}`.toLowerCase();
    if (searchable.includes(q)) {
      results.push({ type: 'quote', id: q2.text.slice(0, 40), name: q2.attribution, excerpt: q2.text, bookId: q2.bookId });
    }
  }

  for (const t of TEMPLATES) {
    const searchable = `${t.name} ${t.format} ${t.usage}`.toLowerCase();
    if (searchable.includes(q)) {
      results.push({ type: 'template', id: t.id, name: t.name, excerpt: t.usage, bookId: t.bookId });
    }
  }

  for (const t of INTERVIEW_TECHNIQUES) {
    const searchable = `${t.name} ${t.description}`.toLowerCase();
    if (searchable.includes(q)) {
      results.push({ type: 'technique', id: t.id, name: t.name, excerpt: t.description, bookId: t.bookId });
    }
  }

  return results.slice(0, maxResults);
}
```

---

### Task 10: MCP Server — All 13 Tools

**Files:**
- Create: `book-power-output/mcp/jtbd-knowledge/src/index.ts`

**Step 1: Write the server with all tool registrations**

Use the new `McpServer` + `registerTool()` API with `zod/v4`. Import from `@modelcontextprotocol/server`.

```typescript
#!/usr/bin/env node

import { McpServer, StdioServerTransport } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { searchAll } from './search.js';
import {
  BOOKS, FRAMEWORKS, WORKFLOWS, RECIPES,
  INTERVIEW_QUESTIONS, INTERVIEW_TECHNIQUES,
  TEMPLATES, ANALYSIS_TEMPLATES, CONCEPTS, QUOTES,
} from './data/index.js';

const server = new McpServer({
  name: 'jtbd-knowledge',
  version: '0.1.0',
});

// === REFERENCE TOOLS (6) ===

server.registerTool('search_content', {
  title: 'Search JTBD Content',
  description: 'Search across all JTBD frameworks, workflows, concepts, quotes, and templates from Moesta and Kalbach.',
  inputSchema: z.object({
    query: z.string().describe('Search query'),
    book: z.enum(['moesta', 'kalbach']).optional().describe('Filter by book'),
    max_results: z.number().optional().describe('Maximum results (default: 10)'),
  }),
}, async ({ query, book, max_results }) => {
  let results = searchAll(query, max_results ?? 10);
  if (book) {
    results = results.filter(r => r.bookId === book);
  }
  return {
    content: [{ type: 'text' as const, text: results.length > 0
      ? JSON.stringify(results, null, 2)
      : `No results found for "${query}"` }],
  };
});

server.registerTool('get_framework', {
  title: 'Get JTBD Framework',
  description: 'Get full details of a specific JTBD framework by ID (e.g., "four-forces-moesta", "universal-job-map", "odi-scoring").',
  inputSchema: z.object({
    id: z.string().describe('Framework ID'),
  }),
}, async ({ id }) => {
  const framework = FRAMEWORKS.find(f => f.id === id);
  if (!framework) {
    const available = FRAMEWORKS.map(f => `  ${f.id} — ${f.name} (${f.bookId})`).join('\n');
    return { content: [{ type: 'text' as const, text: `Framework "${id}" not found. Available:\n${available}` }] };
  }
  return { content: [{ type: 'text' as const, text: JSON.stringify(framework, null, 2) }] };
});

server.registerTool('get_workflow', {
  title: 'Get JTBD Workflow',
  description: 'Get step-by-step instructions for a JTBD workflow (e.g., "conduct-jtbd-interview", "create-job-map", "find-underserved-needs-odi").',
  inputSchema: z.object({
    id: z.string().describe('Workflow ID'),
  }),
}, async ({ id }) => {
  const workflow = WORKFLOWS.find(w => w.id === id);
  if (!workflow) {
    const available = WORKFLOWS.map(w => `  ${w.id} — ${w.name} (${w.bookId})`).join('\n');
    return { content: [{ type: 'text' as const, text: `Workflow "${id}" not found. Available:\n${available}` }] };
  }
  return { content: [{ type: 'text' as const, text: JSON.stringify(workflow, null, 2) }] };
});

server.registerTool('get_recipe', {
  title: 'Get JTBD Recipe',
  description: 'Get a complete JTBD recipe — a sequence of workflows for a common goal (e.g., "launch-new-product", "increase-demand").',
  inputSchema: z.object({
    id: z.string().describe('Recipe ID'),
  }),
}, async ({ id }) => {
  const recipe = RECIPES.find(r => r.id === id);
  if (!recipe) {
    const available = RECIPES.map(r => `  ${r.id} — ${r.name}: ${r.goal}`).join('\n');
    return { content: [{ type: 'text' as const, text: `Recipe "${id}" not found. Available:\n${available}` }] };
  }
  // Expand workflow references
  const expandedSteps = recipe.workflowSequence.map((wId, i) => {
    const w = WORKFLOWS.find(wf => wf.id === wId);
    return `${i + 1}. ${w ? w.name : wId}${w ? ` — ${w.description}` : ''}`;
  });
  return { content: [{ type: 'text' as const, text: JSON.stringify({ ...recipe, expandedSteps }, null, 2) }] };
});

server.registerTool('get_interview_questions', {
  title: 'Get Interview Questions',
  description: 'Get curated JTBD interview questions by type (jobs, switch, cancellation) or category (push, pull, anxiety, habit, etc.).',
  inputSchema: z.object({
    type: z.enum(['jobs', 'switch', 'cancellation', 'all']).describe('Interview type'),
    category: z.string().optional().describe('Filter by category (e.g., "push", "pull", "anxiety", "habit", "background", "needs")'),
  }),
}, async ({ type, category }) => {
  const categoryMap: Record<string, string[]> = {
    jobs: ['background', 'main-job', 'process', 'needs', 'circumstances'],
    switch: ['first-thought', 'timeline', 'push', 'pull', 'anxiety', 'habit', 'time-wall'],
    cancellation: ['cancellation'],
    all: [],
  };
  let questions = INTERVIEW_QUESTIONS;
  if (type !== 'all') {
    const cats = categoryMap[type];
    questions = questions.filter(q => cats.includes(q.category));
  }
  if (category) {
    questions = questions.filter(q => q.category === category);
  }
  return { content: [{ type: 'text' as const, text: JSON.stringify(questions, null, 2) }] };
});

server.registerTool('list_all', {
  title: 'List Available JTBD Content',
  description: 'List all available items of a given type: frameworks, workflows, recipes, templates, concepts, techniques.',
  inputSchema: z.object({
    type: z.enum(['frameworks', 'workflows', 'recipes', 'templates', 'concepts', 'techniques']).describe('Content type to list'),
  }),
}, async ({ type }) => {
  const formatters: Record<string, () => string> = {
    frameworks: () => FRAMEWORKS.map(f => `${f.id} — ${f.name} (${f.bookId}, ${f.chapter})`).join('\n'),
    workflows: () => WORKFLOWS.map(w => `${w.id} — ${w.name} (${w.bookId})`).join('\n'),
    recipes: () => RECIPES.map(r => `${r.id} — ${r.name}: ${r.goal}`).join('\n'),
    templates: () => TEMPLATES.map(t => `${t.id} — ${t.name}`).join('\n'),
    concepts: () => CONCEPTS.map(c => `${c.name} — ${c.definition.slice(0, 80)}...`).join('\n'),
    techniques: () => INTERVIEW_TECHNIQUES.map(t => `${t.id} — ${t.name}`).join('\n'),
  };
  return { content: [{ type: 'text' as const, text: formatters[type]() }] };
});

// === GUIDED ANALYSIS TOOLS (4) ===

server.registerTool('get_analysis_template', {
  title: 'Get Analysis Template',
  description: 'Get a structured analysis template for Claude to fill in from real data. Types: forces, timeline, job_map, odi, personas, competing_solutions.',
  inputSchema: z.object({
    type: z.enum(['forces', 'timeline', 'job_map', 'odi', 'personas', 'competing_solutions']).describe('Analysis type'),
  }),
}, async ({ type }) => {
  const idMap: Record<string, string> = {
    forces: 'forces-analysis',
    timeline: 'timeline-extraction',
    job_map: 'job-map-construction',
    odi: 'odi-scoring',
    personas: 'persona-building',
    competing_solutions: 'competing-solutions',
  };
  const template = ANALYSIS_TEMPLATES.find(t => t.id === idMap[type]);
  if (!template) {
    return { content: [{ type: 'text' as const, text: `Analysis template "${type}" not found.` }] };
  }
  return { content: [{ type: 'text' as const, text: JSON.stringify(template, null, 2) }] };
});

server.registerTool('get_output_format', {
  title: 'Get Output Format',
  description: 'Get the format specification and examples for JTBD artifacts: job_story, value_proposition, desired_outcome, job_statement.',
  inputSchema: z.object({
    type: z.enum(['job_story', 'value_proposition', 'desired_outcome', 'job_statement']).describe('Output format type'),
  }),
}, async ({ type }) => {
  const idMap: Record<string, string> = {
    job_story: 'job-story',
    value_proposition: 'value-proposition',
    desired_outcome: 'desired-outcome',
    job_statement: 'job-statement',
  };
  const template = TEMPLATES.find(t => t.id === idMap[type]);
  if (!template) {
    return { content: [{ type: 'text' as const, text: `Output format "${type}" not found.` }] };
  }
  return { content: [{ type: 'text' as const, text: JSON.stringify(template, null, 2) }] };
});

server.registerTool('format_action_items', {
  title: 'Format JTBD Analysis as Action Items',
  description: 'Get a template for translating JTBD analysis results into actionable project management issues. Provide your PM system context (Linear, Jira, GitHub, etc.) as project_context.',
  inputSchema: z.object({
    analysis_type: z.enum(['forces', 'timeline', 'job_map', 'odi', 'personas', 'competing_solutions']).describe('What type of JTBD analysis to translate'),
    project_context: z.string().optional().describe('Your PM system and project structure (e.g., "Linear: Growth & Marketing initiative, projects: Marketing Research, Product Growth")'),
  }),
}, async ({ analysis_type, project_context }) => {
  const templates: Record<string, string> = {
    forces: `## Translating Four Forces Analysis into Action Items

For each force identified:

### PUSH issues (reduce friction with current solutions)
- Title: "Reduce [specific frustration] for [persona]"
- Description: Include the push quote, current workaround, and proposed solution
- Priority: Based on strength (strong → urgent, moderate → high, weak → medium)

### PULL issues (strengthen attraction to new solution)
- Title: "Enable [specific aspiration] through [feature/change]"
- Description: Include the pull quote and how the feature addresses it

### ANXIETY issues (reduce barriers to adoption)
- Title: "Reduce anxiety about [specific concern]"
- Description: Specific concern, proposed mitigation (demo, trial, guarantee, social proof)

### HABIT issues (make switching easier)
- Title: "Ease transition from [current habit]"
- Description: What habit to preserve or replace, migration path`,

    timeline: `## Translating Timeline Analysis into Action Items

For each phase where friction was found:

### First Thought / Passive Looking
- Marketing/content issues: "Create [content type] that surfaces [problem awareness]"
- SEO/discovery issues: "Improve discoverability for [search intent]"

### Active Looking
- Comparison/evaluation issues: "Provide [comparison tool/content] for [decision criteria]"

### Deciding
- Conversion issues: "Add [time wall / urgency mechanism]"
- Trust issues: "Provide [social proof / guarantee] at decision point"

### Onboarding
- Setup issues: "Simplify [onboarding step] to match expectations set during [phase]"

### Ongoing Use
- Retention issues: "Address [new struggling moment] discovered post-adoption"`,

    job_map: `## Translating Job Map into Action Items

For each stage of the job map:

- Title: "[Improve/Automate/Simplify] [stage verb] stage for [main job]"
- Description: Include micro-jobs at this stage, current pain points, desired outcomes
- Acceptance criteria: Specific desired outcome statements that should be satisfied

Prioritize stages with:
1. Most pain points / workarounds
2. Highest emotional intensity
3. Most time-consuming micro-jobs`,

    odi: `## Translating ODI Scores into Action Items

### Underserved needs (score > 12) → Feature development
- Title: "Address underserved need: [desired outcome statement]"
- Description: Importance: X/10, Satisfaction: X/10, Opportunity Score: X/20
- Priority: Urgent (score 16+), High (score 13-15), Medium (score 12)

### Overserved needs (score < 8) → Simplification opportunities
- Title: "Simplify/remove [overserved feature]"
- Description: This need is well-served but not important — opportunity to reduce complexity

### Market positioning
- Title: "Position against [competitor] on [underserved dimension]"`,

    personas: `## Translating Personas into Action Items

For each persona identified:

- Title: "Optimize [feature/flow] for [persona name] persona"
- Description: Goals, circumstances, frustrations specific to this persona
- Use persona name as a label/tag for grouping related issues

### Cross-persona issues
- Title: "Resolve [need] that spans [persona A] and [persona B]"
- These are high-impact — they serve multiple segments`,

    competing_solutions: `## Translating Competitive Analysis into Action Items

### Sweet spot opportunities
- Title: "Differentiate on [dimension where we're uniquely strong]"
- Description: Our rating vs competitors, why this matters to job performers

### Gap issues
- Title: "Close gap on [dimension where we're weak]"
- Description: Current rating, competitor ratings, minimum viable improvement

### Strategy alignment
- Title: "Execute [strategy type] positioning against [competitor]"
- Description: Based on Growth Strategy Matrix analysis`,
  };

  let result = templates[analysis_type] || 'No template available for this analysis type.';

  if (project_context) {
    result += `\n\n---\n\n**Project context provided:** ${project_context}\n\nAdapt the issue titles, labels, and project assignments to match this structure.`;
  }

  return { content: [{ type: 'text' as const, text: result }] };
});

server.registerTool('suggest_next_step', {
  title: 'Suggest Next Step',
  description: 'Based on where you are in the JTBD process and your goal, suggests which framework/tool to use next. Uses Kalbach\'s 5 recipes as the navigation graph.',
  inputSchema: z.object({
    current_stage: z.string().describe('What you just completed (e.g., "jobs-interviews-done", "forces-extracted", "job-map-built", "starting")'),
    goal: z.string().optional().describe('Your end goal (e.g., "launch new product", "increase demand", "reduce churn", "build strategy")'),
  }),
}, async ({ current_stage, goal }) => {
  // Simple state machine based on recipes
  const stage = current_stage.toLowerCase();
  const g = (goal || '').toLowerCase();

  // Match to recipe based on goal
  let recipe: typeof RECIPES[0] | undefined;
  if (g.includes('launch') || g.includes('new product')) {
    recipe = RECIPES.find(r => r.id === 'launch-new-product');
  } else if (g.includes('optim') || g.includes('improve') || g.includes('existing')) {
    recipe = RECIPES.find(r => r.id === 'optimize-existing-product');
  } else if (g.includes('demand') || g.includes('acquisition') || g.includes('switch') || g.includes('growth')) {
    recipe = RECIPES.find(r => r.id === 'increase-demand');
  } else if (g.includes('churn') || g.includes('retention') || g.includes('success') || g.includes('onboard')) {
    recipe = RECIPES.find(r => r.id === 'make-customers-successful');
  } else if (g.includes('strateg') || g.includes('innovat')) {
    recipe = RECIPES.find(r => r.id === 'build-innovation-strategy');
  }

  // Determine next step based on current stage
  const suggestions: Record<string, string> = {
    'starting': `Start with interviews. Use get_interview_questions to prepare your guide.\n\nRecommended recipe: ${recipe ? `"${recipe.name}" → ${recipe.workflowSequence.join(' → ')}` : 'Tell me your goal and I\'ll suggest a recipe.'}`,
    'interviews-done': 'Analyze your interview data:\n1. Use get_analysis_template("forces") to extract Four Forces\n2. Use get_analysis_template("timeline") to map the buyer timeline\n3. Then synthesize patterns across interviews',
    'forces-extracted': 'Good. Next steps depend on your goal:\n- For product development: Build a Job Map → get_analysis_template("job_map")\n- For demand/growth: Create Job Stories → get_output_format("job_story")\n- For strategy: Score opportunities → get_analysis_template("odi")',
    'timeline-extracted': 'Now map the forces at each timeline phase. Use get_analysis_template("forces") if you haven\'t already. Then:\n- Identify the triggering events between phases\n- Find where people get stuck (anxiety/habit dominates)',
    'job-map-built': 'With your job map, you can:\n1. Define desired outcomes at each stage → get_output_format("desired_outcome")\n2. Survey for importance/satisfaction → get_analysis_template("odi")\n3. Create job stories → get_output_format("job_story")',
    'odi-scored': 'Your top underserved needs are your product opportunities. Next:\n1. Compare competing solutions → get_analysis_template("competing_solutions")\n2. Define your value proposition → get_output_format("value_proposition")\n3. Translate to action items → format_action_items("odi")',
    'personas-built': 'Use personas to:\n1. Prioritize which job performers to serve first\n2. Design specific solutions for each persona\'s circumstances\n3. Create targeted messaging that speaks to their specific struggles',
    'value-proposition-defined': 'Now translate to development:\n1. Create job stories for each underserved need → get_output_format("job_story")\n2. Build a development roadmap (now/later/future)\n3. Generate action items → format_action_items with your PM context',
    'action-items-created': 'You\'ve completed the JTBD analysis cycle! Consider:\n1. Validate assumptions with prototype testing\n2. Re-interview after shipping to check if needs are now served\n3. Run the cycle again for the next set of underserved needs',
  };

  // Find best match
  let response = suggestions['starting'];
  for (const [key, value] of Object.entries(suggestions)) {
    if (stage.includes(key.replace(/-/g, ' ').replace(/_/g, ' ')) || stage.includes(key)) {
      response = value;
      break;
    }
  }

  if (recipe && !response.includes(recipe.name)) {
    response += `\n\nBased on your goal, follow the "${recipe.name}" recipe:\n${recipe.workflowSequence.map((wId, i) => {
      const w = WORKFLOWS.find(wf => wf.id === wId);
      return `${i + 1}. ${w ? w.name : wId}`;
    }).join('\n')}`;
  }

  return { content: [{ type: 'text' as const, text: response }] };
});

// === NAVIGATION TOOLS (3) ===

server.registerTool('get_technique', {
  title: 'Get Interview Technique',
  description: 'Get details on a specific JTBD interview technique (e.g., "unpack-vague-words", "play-it-back-wrong", "cinematic-details").',
  inputSchema: z.object({
    id: z.string().describe('Technique ID'),
  }),
}, async ({ id }) => {
  const technique = INTERVIEW_TECHNIQUES.find(t => t.id === id);
  if (!technique) {
    const available = INTERVIEW_TECHNIQUES.map(t => `  ${t.id} — ${t.name}`).join('\n');
    return { content: [{ type: 'text' as const, text: `Technique "${id}" not found. Available:\n${available}` }] };
  }
  return { content: [{ type: 'text' as const, text: JSON.stringify(technique, null, 2) }] };
});

server.registerTool('compare_books', {
  title: 'Compare Books on Topic',
  description: 'Compare how Moesta and Kalbach each treat a specific JTBD topic (e.g., "four forces", "interviews", "job mapping").',
  inputSchema: z.object({
    topic: z.string().describe('Topic to compare across books'),
  }),
}, async ({ topic }) => {
  const q = topic.toLowerCase();

  const moestaFrameworks = FRAMEWORKS.filter(f => f.bookId === 'moesta' && `${f.name} ${f.description}`.toLowerCase().includes(q));
  const kalbachFrameworks = FRAMEWORKS.filter(f => f.bookId === 'kalbach' && `${f.name} ${f.description}`.toLowerCase().includes(q));
  const moestaWorkflows = WORKFLOWS.filter(w => w.bookId === 'moesta' && `${w.name} ${w.description}`.toLowerCase().includes(q));
  const kalbachWorkflows = WORKFLOWS.filter(w => w.bookId === 'kalbach' && `${w.name} ${w.description}`.toLowerCase().includes(q));

  const comparison = {
    topic,
    moesta: {
      book: 'Demand-Side Sales 101 (Bob Moesta, 2020)',
      perspective: 'Sales-oriented — focuses on understanding how people buy, the struggling moment, and demand creation',
      frameworks: moestaFrameworks.map(f => ({ name: f.name, description: f.description })),
      workflows: moestaWorkflows.map(w => ({ name: w.name, description: w.description })),
    },
    kalbach: {
      book: 'The Jobs To Be Done Playbook (Jim Kalbach, 2020)',
      perspective: 'Product-oriented — systematic methodology for discovering, defining, designing, and delivering value',
      frameworks: kalbachFrameworks.map(f => ({ name: f.name, description: f.description })),
      workflows: kalbachWorkflows.map(w => ({ name: w.name, description: w.description })),
    },
  };

  return { content: [{ type: 'text' as const, text: JSON.stringify(comparison, null, 2) }] };
});

server.registerTool('get_quote', {
  title: 'Get JTBD Quote',
  description: 'Get relevant quotes from Moesta and/or Kalbach by topic.',
  inputSchema: z.object({
    topic: z.string().optional().describe('Topic to filter quotes by (e.g., "struggling moment", "disruption", "interview")'),
    book: z.enum(['moesta', 'kalbach']).optional().describe('Filter by book'),
  }),
}, async ({ topic, book }) => {
  let quotes = QUOTES;
  if (book) {
    quotes = quotes.filter(q => q.bookId === book);
  }
  if (topic) {
    const t = topic.toLowerCase();
    quotes = quotes.filter(q =>
      q.topicTags.some(tag => tag.includes(t)) ||
      q.text.toLowerCase().includes(t)
    );
  }
  if (quotes.length === 0) {
    return { content: [{ type: 'text' as const, text: `No quotes found${topic ? ` for topic "${topic}"` : ''}.` }] };
  }
  return { content: [{ type: 'text' as const, text: JSON.stringify(quotes, null, 2) }] };
});

// === START SERVER ===

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('JTBD Knowledge MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
```

---

### Task 11: Build, Test, and Install

**Step 1: Build the project**

Run: `cd book-power-output/mcp/jtbd-knowledge && npm run build`
Expected: Compiles successfully, `dist/` directory created

**Step 2: Test the server starts**

Run: `cd book-power-output/mcp/jtbd-knowledge && echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"0.1.0"}}}' | node dist/index.js`
Expected: JSON-RPC response with server capabilities

**Step 3: Fix any build/runtime errors**

If the MCP SDK import paths or API have changed, check Context7 docs and fix.

**Step 4: Install in Claude Code**

Run from workspace root:
```bash
cd /c/Users/temaz/claude-project && claude mcp add-json jtbd-knowledge '{"command":"node","args":["C:/Users/temaz/claude-project/book-power-output/mcp/jtbd-knowledge/dist/index.js"]}' -s local
```

**Step 5: Verify**

Restart Claude Code session and test:
- Call `list_all` with type "frameworks" — should list all 23 frameworks
- Call `get_recipe` with id "increase-demand" — should return the recipe with expanded workflow steps
- Call `suggest_next_step` with current_stage "starting" and goal "increase demand" — should suggest the Increase Demand recipe

**Step 6: Commit**

```bash
cd book-power-output/mcp/jtbd-knowledge && git init && git add -A && git commit -m "feat: JTBD Knowledge MCP server — Moesta + Kalbach"
```

---

## Important Notes for Implementation

1. **Data completeness is critical.** The analysis files contain ALL the content needed. Read `book-power/books/analysis-moesta-demand-side-sales.md` and `book-power/books/analysis-kalbach-jtbd-playbook.md` thoroughly and populate EVERY framework, workflow, concept, and quote. Partial data defeats the purpose.

2. **MCP SDK version.** The `@modelcontextprotocol/server` package with `registerTool()` and `zod/v4` is the current API. If `npm install` gets an older version, check if the package is still named `@modelcontextprotocol/sdk` and adjust imports accordingly. The old API used `server.tool()` with variadic args — both work but prefer `registerTool()`.

3. **Workflow IDs must match across files.** Recipe `workflowSequence` arrays reference workflow IDs. Ensure consistency. Example: if a recipe references `'conduct-jobs-interviews'`, the workflow must have `id: 'conduct-jobs-interviews'`.

4. **No git repo needed initially.** The `book-power-output/` directory is generated output. Only init git if the user wants to track it.

5. **zod version.** The SDK docs show `import * as z from 'zod/v4'`. This requires zod v4. If the SDK's peer dependency is still zod v3, use `import { z } from 'zod'` instead with the standard v3 API (`.object()`, `.string()`, `.enum()`, etc. — same surface API).
