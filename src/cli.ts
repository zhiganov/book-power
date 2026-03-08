#!/usr/bin/env node

import 'dotenv/config';
import { resolve } from 'node:path';
import { log } from './logger.js';
import { detectSource } from './ingest/detect.js';
import { extractBookContent } from './ingest/structure.js';
import { detectLicense, licenseAllowsDerivatives } from './analyze/copyright.js';
import { analyzeBook } from './analyze/analyze.js';
import { generateCommand } from './generators/command.js';
import { generateAvatar } from './generators/avatar.js';
import { generateMcpServer } from './generators/mcp-server.js';
import type { OutputFormat } from './types.js';

const USAGE = `
book-power — Turn books into conversational avatars, slash commands, or MCP servers

Usage:
  book-power process <source> --output <format> [--output-dir <dir>]

Arguments:
  source    URL, file path, or directory of the book
  format    Output format: avatar | command | mcp

Options:
  --output-dir    Directory for generated output (default: ./output/<format>)
  --skip-copyright  Skip copyright verification
  --no-datalab    Force Kreuzberg for PDF extraction (skips Datalab even if API key is set)

Examples:
  book-power process https://producingoss.com/en/producingoss.html --output command
  book-power process ./my-book.pdf --output avatar
  book-power process ./book-chapters/ --output mcp
`.trim();

interface ParsedArgs {
  command: string;
  source: string;
  output: OutputFormat;
  outputDir?: string;
  skipCopyright: boolean;
  useDatalab?: boolean;
}

function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2); // skip node and script path

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(USAGE);
    process.exit(0);
  }

  const command = args[0];

  if (command !== 'process') {
    console.error(`Unknown command: ${command}\n\n${USAGE}`);
    process.exit(1);
  }

  const source = args[1];
  if (!source) {
    console.error('Error: source argument is required\n\n' + USAGE);
    process.exit(1);
  }

  let output: OutputFormat | undefined;
  let outputDir: string | undefined;
  let skipCopyright = false;
  let useDatalab: boolean | undefined;

  for (let i = 2; i < args.length; i++) {
    switch (args[i]) {
      case '--output':
        output = args[++i] as OutputFormat;
        if (!['avatar', 'command', 'mcp'].includes(output)) {
          console.error(`Invalid output format: ${output}. Must be avatar, command, or mcp.`);
          process.exit(1);
        }
        break;
      case '--output-dir':
        outputDir = args[++i];
        break;
      case '--skip-copyright':
        skipCopyright = true;
        break;
      case '--no-datalab':
        useDatalab = false;
        break;
      default:
        console.error(`Unknown option: ${args[i]}`);
        process.exit(1);
    }
  }

  if (!output) {
    console.error('Error: --output is required\n\n' + USAGE);
    process.exit(1);
  }

  return { command, source, output, outputDir, skipCopyright, useDatalab };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);
  const outputDir = args.outputDir || resolve('output', args.output);

  log.header(`book-power v0.1.0`);
  log.info(`Source: ${args.source}`);
  log.info(`Output: ${args.output} → ${outputDir}`);

  // Step 1: Detect and ingest
  log.step(1, 5, 'Detecting source format...');
  const source = await detectSource(args.source);
  log.info(`Detected: ${source.location} / ${source.format}`);

  // Step 2: Extract content
  log.step(2, 5, 'Extracting book content...');
  const book = await extractBookContent(source, { useDatalab: args.useDatalab });
  log.info(`"${book.metadata.title}" by ${book.metadata.author}`);
  log.info(`${book.totalChapters} chapters, ${book.totalWordCount.toLocaleString()} words`);

  // Step 3: Copyright check
  log.step(3, 5, 'Checking copyright...');
  const allText = book.chapters.map((ch) =>
    ch.sections.map((s) => s.content).join('\n')
  ).join('\n');
  const copyright = detectLicense(allText);

  if (!args.skipCopyright && !licenseAllowsDerivatives(copyright)) {
    log.error(`License "${copyright.licenseFullName}" does not allow derivative works.`);
    log.error('Use --skip-copyright to override (at your own risk).');
    process.exit(1);
  }

  log.info(`License: ${copyright.licenseFullName} (derivatives: ${copyright.allowsDerivatives ? 'yes' : 'no'})`);

  // Step 4: Analyze with Claude
  log.step(4, 5, 'Analyzing book with Claude...');
  const analysis = await analyzeBook(book);
  log.info(`Extracted ${analysis.principles.length} principles, ${analysis.frameworks.length} frameworks`);
  log.info(`Suggested command: ${analysis.suggestedCommandName} (${analysis.commandType})`);

  // Step 5: Generate output
  log.step(5, 5, `Generating ${args.output} output...`);

  let result;
  switch (args.output) {
    case 'command':
      result = await generateCommand(book, analysis, copyright, outputDir);
      break;
    case 'avatar':
      result = await generateAvatar(book, analysis, copyright, outputDir);
      break;
    case 'mcp':
      result = await generateMcpServer(book, analysis, copyright, outputDir);
      break;
  }

  log.header('Done!');
  log.success(`Output: ${result.outputDir}`);
  log.info('Generated files:');
  for (const file of result.files) {
    log.info(`  ${file}`);
  }
}

main().catch((err) => {
  log.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
