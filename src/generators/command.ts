import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { BookContent, BookAnalysis, CopyrightInfo, GeneratorOutput, Framework } from '../types.js';
import { log } from '../logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dirname, '..', '..', 'templates', 'command');

interface CommandConfig {
  commandName: string;
  commandSlug: string;
  commandTitle: string;
  commandDescription: string;
  commandFile: string;
  dataFile: string;
  githubUser: string;
  repoName: string;
}

/**
 * Generate a publishable slash command repo from book analysis.
 */
export async function generateCommand(
  book: BookContent,
  analysis: BookAnalysis,
  copyright: CopyrightInfo,
  outputDir: string
): Promise<GeneratorOutput> {
  log.header('Generating slash command...');

  const config = buildConfig(analysis, book);
  mkdirSync(outputDir, { recursive: true });

  const files: string[] = [];

  // 1. Generate the data file (checklist/principles reference)
  const dataContent = generateDataFile(analysis, book);
  const dataPath = join(outputDir, config.dataFile);
  writeFileSync(dataPath, dataContent, 'utf-8');
  files.push(config.dataFile);
  log.info(`Generated ${config.dataFile}`);

  // 2. Generate the command .md file
  const commandContent = generateCommandFile(config, analysis, book, copyright);
  const commandPath = join(outputDir, config.commandFile);
  writeFileSync(commandPath, commandContent, 'utf-8');
  files.push(config.commandFile);
  log.info(`Generated ${config.commandFile}`);

  // 3. Generate install.sh
  const installSh = generateInstallSh(config);
  writeFileSync(join(outputDir, 'install.sh'), installSh, 'utf-8');
  files.push('install.sh');

  // 4. Generate install.ps1
  const installPs1 = generateInstallPs1(config);
  writeFileSync(join(outputDir, 'install.ps1'), installPs1, 'utf-8');
  files.push('install.ps1');

  // 5. Generate README.md
  const readme = generateReadme(config, analysis, book, copyright);
  writeFileSync(join(outputDir, 'README.md'), readme, 'utf-8');
  files.push('README.md');

  // 6. Generate LICENSE
  const license = generateLicense();
  writeFileSync(join(outputDir, 'LICENSE'), license, 'utf-8');
  files.push('LICENSE');

  log.success(`Command generated at ${outputDir}`);

  return { format: 'command', outputDir, files };
}

function buildConfig(analysis: BookAnalysis, book: BookContent): CommandConfig {
  const slug = analysis.suggestedCommandName || 'book-command';
  return {
    commandName: `claude-${slug}`,
    commandSlug: slug,
    commandTitle: deriveTitle(analysis, book),
    commandDescription: deriveSummaryLine(analysis, book),
    commandFile: `${slug}.md`,
    dataFile: `${slug}-reference.md`,
    githubUser: 'zhiganov',
    repoName: `claude-${slug}`,
  };
}

function deriveTitle(analysis: BookAnalysis, book: BookContent): string {
  switch (analysis.commandType) {
    case 'audit':
      return `${capitalize(analysis.primaryAction)} Audit`;
    case 'advisory':
      return `${capitalize(analysis.primaryAction)} Guide`;
    case 'consult':
      return `${capitalize(analysis.primaryAction)} Consultation`;
    case 'generate':
      return `${capitalize(analysis.primaryAction)} Generator`;
    default:
      return book.metadata.title;
  }
}

function deriveSummaryLine(analysis: BookAnalysis, book: BookContent): string {
  switch (analysis.commandType) {
    case 'audit':
      return `Run a ${analysis.expertise[0] || 'project'} audit based on "${book.metadata.title}" by ${book.metadata.author}.`;
    case 'advisory':
      return `Get actionable advice on ${analysis.expertise[0] || 'your project'} based on "${book.metadata.title}" by ${book.metadata.author}.`;
    case 'consult':
      return `Consult the principles of "${book.metadata.title}" by ${book.metadata.author} for guidance.`;
    case 'generate':
      return `Generate artifacts guided by "${book.metadata.title}" by ${book.metadata.author}.`;
    default:
      return `Apply insights from "${book.metadata.title}" by ${book.metadata.author}.`;
  }
}

function generateDataFile(analysis: BookAnalysis, book: BookContent): string {
  const lines: string[] = [];

  lines.push(`# ${book.metadata.title} — Reference Data`);
  lines.push('');
  lines.push(`Source: "${book.metadata.title}" by ${book.metadata.author}`);
  lines.push('');

  // Principles as categories with items
  if (analysis.frameworks.length > 0) {
    lines.push('## Evaluation Categories');
    lines.push('');

    for (let i = 0; i < analysis.frameworks.length; i++) {
      const fw = analysis.frameworks[i];
      const slug = slugify(fw.name);
      lines.push(`### ${i + 1}. ${fw.name} (\`${slug}\`)`);
      lines.push('');
      lines.push(fw.description);
      lines.push('');

      for (const step of fw.steps) {
        lines.push(`- [ ] **${step.label}** — ${step.description}`);
      }
      lines.push('');
    }
  }

  if (analysis.principles.length > 0) {
    lines.push('## Key Principles');
    lines.push('');

    for (const p of analysis.principles) {
      lines.push(`### ${p.name}`);
      lines.push('');
      lines.push(p.description);
      lines.push(`*(Source: ${p.sourceChapter})*`);
      lines.push('');
    }
  }

  return lines.join('\n');
}

function generateCommandFile(
  config: CommandConfig,
  analysis: BookAnalysis,
  book: BookContent,
  copyright: CopyrightInfo
): string {
  const hasCategories = analysis.frameworks.length > 0;
  const lines: string[] = [];

  lines.push(`# ${config.commandTitle}`);
  lines.push('');
  lines.push(config.commandDescription);
  lines.push('');

  // Arguments
  lines.push('## Arguments');
  lines.push('');
  if (analysis.commandType === 'audit') {
    lines.push('- `$ARGUMENTS` — project directory name (e.g., `my-project`)' +
      (hasCategories ? ' and optional `--focus <category>` flag' : ''));
  } else {
    lines.push('- `$ARGUMENTS` — subject or topic to analyze' +
      (hasCategories ? ' and optional `--focus <category>` flag' : ''));
  }
  lines.push('');

  // Instructions
  lines.push('## Instructions');
  lines.push('');

  // Step 1: Parse
  lines.push('### Step 1: Parse Arguments');
  lines.push('');
  lines.push('Parse `$ARGUMENTS` to extract:');
  if (analysis.commandType === 'audit') {
    lines.push('- **project**: directory name (required) — must be a subdirectory of the workspace');
  } else {
    lines.push('- **subject**: the topic or project to analyze (required)');
  }
  if (hasCategories) {
    const categoryFlags = analysis.frameworks.map((fw) => `\`${slugify(fw.name)}\``).join(', ');
    lines.push(`- **--focus**: optional category filter (one of: ${categoryFlags})`);
  }
  lines.push('');
  if (analysis.commandType === 'audit') {
    lines.push('If no project is specified, ask the user which project to audit.');
  } else {
    lines.push('If no subject is specified, ask the user what to analyze.');
  }
  lines.push('');

  // Step 2: Load reference data
  lines.push('### Step 2: Load Reference Data');
  lines.push('');
  lines.push(`Read the reference data from \`~/.claude/${config.dataFile}\`.`);
  lines.push('');

  if (hasCategories) {
    lines.push(`The reference has ${analysis.frameworks.length} categories:`);
    for (let i = 0; i < analysis.frameworks.length; i++) {
      const fw = analysis.frameworks[i];
      lines.push(`${i + 1}. ${fw.name} (\`${slugify(fw.name)}\`)`);
    }
    lines.push('');
    lines.push('If `--focus` was provided, only evaluate that category. Otherwise evaluate all categories.');
    lines.push('');
  }

  // Step 3: Examine
  lines.push('### Step 3: Examine the Subject');
  lines.push('');
  if (analysis.commandType === 'audit') {
    lines.push('For each item in scope, investigate the project to determine the status:');
    lines.push('- Read key project files (README, docs, config files)');
    lines.push('- Check for relevant infrastructure and automation');
    lines.push('- Check project history and activity signals');
    lines.push('- Use the Explore agent or parallel file reads to gather information efficiently');
    lines.push('');
    lines.push('**Important:** Be honest and specific. Don\'t mark something as present if it\'s only partially there — use `[~]` for partial.');
  } else {
    lines.push('Gather relevant information about the subject:');
    lines.push('- Read provided materials or project files');
    lines.push('- Apply each principle and framework from the reference data');
    lines.push('- Use the Explore agent or parallel file reads to gather information efficiently');
    lines.push('');
    lines.push('**Important:** Ground all recommendations in specific principles from the source material.');
  }
  lines.push('');

  // Step 4: Score/Report
  lines.push(`### Step 4: ${analysis.commandType === 'audit' ? 'Score and Report' : 'Analyze and Report'}`);
  lines.push('');
  lines.push('Output the results as:');
  lines.push('');
  lines.push('```');
  lines.push(`# ${config.commandTitle}: {subject-name}`);
  lines.push('Date: {today}');
  if (hasCategories) {
    lines.push(`Focus: {category or "Full ${analysis.commandType}"}`);
  }
  lines.push('');
  lines.push('## Summary');
  if (analysis.commandType === 'audit') {
    lines.push('- Score: {checked}/{total} ({percentage}%)');
    lines.push('- Partial: {partial-count}');
    lines.push('- Missing: {missing-count}');
    lines.push('- N/A: {na-count}');
  } else {
    lines.push('{2-3 sentence summary of findings}');
  }
  lines.push('');

  if (analysis.commandType === 'audit' && hasCategories) {
    lines.push('## {Category Name}');
    lines.push('');
    lines.push('- [x] **Item name** — {brief note on what was found}');
    lines.push('- [~] **Item name** — {what\'s there vs what\'s missing}');
    lines.push('- [ ] **Item name** — {why it\'s missing / what to do}');
    lines.push('- [n/a] **Item name** — {why not applicable}');
    lines.push('');
    lines.push('... (repeat for each category in scope)');
  } else {
    lines.push('## Findings');
    lines.push('');
    lines.push('{Detailed findings organized by category or principle}');
  }
  lines.push('');
  lines.push('## Top Priorities');
  lines.push('');
  lines.push('1. {Most impactful item} — {why it matters}');
  lines.push('2. {Second most impactful} — {why it matters}');
  lines.push('3. {Third most impactful} — {why it matters}');
  if (analysis.commandType === 'audit') {
    lines.push('');
    lines.push('## Quick Wins');
    lines.push('');
    lines.push('- {Easy improvement that could be done in a single session}');
    lines.push('- {Another quick win}');
  }
  lines.push('```');
  lines.push('');

  // Step 5: Save
  lines.push('### Step 5: Save Results');
  lines.push('');
  const outputFile = analysis.commandType === 'audit'
    ? `${config.commandSlug.toUpperCase().replace(/-/g, '-')}-REPORT.md`
    : `${config.commandSlug}-report.md`;
  lines.push(`Save the results to \`{subject-dir}/${outputFile}\` only if the user agrees. Ask first:`);
  lines.push('');
  lines.push(`> "Save results to \`{subject}/${outputFile}\`?"`);
  lines.push('');

  // Step 6: Next steps
  lines.push('### Step 6: Offer Next Steps');
  lines.push('');
  lines.push('After showing results, offer:');
  if (analysis.commandType === 'audit') {
    lines.push('- "Want me to fix any of the quick wins now?"');
    lines.push('- "Want me to create tasks for the top priorities?"');
    lines.push('- "Want to audit another project?"');
  } else {
    lines.push('- "Want me to help implement any of these recommendations?"');
    lines.push('- "Want me to create tasks for the top priorities?"');
    lines.push('- "Want to analyze another subject?"');
  }
  lines.push('');

  // Category reference table
  if (hasCategories) {
    lines.push('## Category Reference (for --focus)');
    lines.push('');
    lines.push('| Flag | Category |');
    lines.push('|------|----------|');
    for (const fw of analysis.frameworks) {
      lines.push(`| \`${slugify(fw.name)}\` | ${fw.name} |`);
    }
    lines.push('');
  }

  // Notes
  lines.push('## Notes');
  lines.push('');
  lines.push(`- The reference data is at \`~/.claude/${config.dataFile}\` — it can be customized`);
  lines.push('- Not all items apply to every subject — use `[n/a]` for items that genuinely don\'t apply');
  lines.push(`- Based on "${book.metadata.title}" by ${book.metadata.author} (${copyright.licenseFullName})`);
  lines.push('');

  return lines.join('\n');
}

function generateInstallSh(config: CommandConfig): string {
  const dataDownload = `curl -fsSL "$REPO_URL/${config.dataFile}" -o "$CLAUDE_DIR/${config.dataFile}"\necho "✓ Installed ${config.dataFile} → ~/.claude/"`;

  return `#!/bin/bash
# Install ${config.commandName} for Claude Code

set -e

REPO_URL="https://raw.githubusercontent.com/${config.githubUser}/${config.repoName}/main"
CLAUDE_DIR="$HOME/.claude"

echo "Installing ${config.commandName}..."

# Create directories
mkdir -p "$CLAUDE_DIR/commands"

# Download command file
curl -fsSL "$REPO_URL/${config.commandFile}" -o "$CLAUDE_DIR/commands/${config.commandFile}"
echo "✓ Installed ${config.commandFile} → ~/.claude/commands/"

# Download reference data
${dataDownload}

echo ""
echo "Installation complete! Use /${config.commandSlug} in Claude Code to get started."
`;
}

function generateInstallPs1(config: CommandConfig): string {
  const dataDownload = `Invoke-WebRequest -Uri "$RepoUrl/${config.dataFile}" -OutFile "$ClaudeDir\\${config.dataFile}"\nWrite-Host "✓ Installed ${config.dataFile} → ~/.claude/"`;

  return `# Install ${config.commandName} for Claude Code

$ErrorActionPreference = "Stop"

$RepoUrl = "https://raw.githubusercontent.com/${config.githubUser}/${config.repoName}/main"
$ClaudeDir = "$env:USERPROFILE\\.claude"

Write-Host "Installing ${config.commandName}..."

# Create directories
New-Item -ItemType Directory -Force -Path "$ClaudeDir\\commands" | Out-Null

# Download command file
Invoke-WebRequest -Uri "$RepoUrl/${config.commandFile}" -OutFile "$ClaudeDir\\commands\\${config.commandFile}"
Write-Host "✓ Installed ${config.commandFile} → ~/.claude/commands/"

# Download reference data
${dataDownload}

Write-Host ""
Write-Host "Installation complete! Use /${config.commandSlug} in Claude Code to get started."
`;
}

function generateReadme(
  config: CommandConfig,
  analysis: BookAnalysis,
  book: BookContent,
  copyright: CopyrightInfo
): string {
  const hasCategories = analysis.frameworks.length > 0;

  const usageArgs = analysis.commandType === 'audit'
    ? '<project-directory>' + (hasCategories ? ' [--focus <category>]' : '')
    : '<subject>' + (hasCategories ? ' [--focus <category>]' : '');

  const examples = analysis.commandType === 'audit'
    ? `### Examples\n\n- Full audit: \`/${config.commandSlug} my-project\`\n` +
      (hasCategories ? `- Focused: \`/${config.commandSlug} my-project --focus ${slugify(analysis.frameworks[0].name)}\`\n` : '')
    : `### Examples\n\n- Full analysis: \`/${config.commandSlug} my-topic\`\n` +
      (hasCategories ? `- Focused: \`/${config.commandSlug} my-topic --focus ${slugify(analysis.frameworks[0].name)}\`\n` : '');

  const itemCount = analysis.frameworks.reduce((sum, fw) => sum + fw.steps.length, 0);
  const howItWorks = analysis.commandType === 'audit'
    ? `${itemCount}-item checklist across ${analysis.frameworks.length} categories, evaluated against your project. Produces a scored report with priorities and quick wins.`
    : `Applies ${analysis.principles.length} principles and ${analysis.frameworks.length} frameworks from the book to analyze your subject. Produces a structured report with recommendations.`;

  const manualSteps = `2. Copy \`${config.dataFile}\` to \`~/.claude/\``;

  return `# ${config.commandName}

${config.commandDescription}

## Installation

### Quick install

**macOS/Linux:**
\`\`\`bash
curl -fsSL https://raw.githubusercontent.com/${config.githubUser}/${config.repoName}/main/install.sh | bash
\`\`\`

**Windows (PowerShell):**
\`\`\`powershell
irm https://raw.githubusercontent.com/${config.githubUser}/${config.repoName}/main/install.ps1 | iex
\`\`\`

### Manual install

1. Copy \`${config.commandFile}\` to \`~/.claude/commands/\`
${manualSteps}

## Usage

\`\`\`
/${config.commandSlug} ${usageArgs}
\`\`\`

${examples}

## How it works

${howItWorks}

## Source

Generated by [book-power](https://github.com/zhiganov/book-power) from "${book.metadata.title}" by ${book.metadata.author} (${copyright.licenseFullName}).

## License

MIT
`;
}

function generateLicense(): string {
  const year = new Date().getFullYear();
  return `MIT License

Copyright (c) ${year}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
