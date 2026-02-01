# Book Power

Turn a book into a conversational avatar, slash command, or MCP server — interactively.

## Arguments

- `$ARGUMENTS` — optional: book URL or file path. If not provided, ask the user.

## Instructions

### Step 1: Get Book Source

If `$ARGUMENTS` contains a URL or file path, use that. Otherwise ask:

> "What book would you like to process? Provide a URL (e.g., https://producingoss.com/en/producingoss.html) or a local file path."

### Step 2: Extract Content

Use Firecrawl or WebFetch to retrieve the book content:
- For URLs: fetch the page, detect if it's a single-page or multi-page book (look for table of contents with chapter links)
- For multi-page books: fetch each chapter page
- For local files: read them directly

Parse the content into chapters and sections. Strip navigation, headers, footers — keep prose only.

Report to the user:
> "Found **{title}** by {author}. {chapter_count} chapters, ~{word_count} words."

### Step 3: Verify Copyright

Search the content for license information (Creative Commons, public domain, MIT, etc.). Report findings:

> "License detected: **{license_name}**"
> - Allows derivatives: {yes/no}
> - Requires attribution: {yes/no}
> - Commercial use: {yes/no}

If no license is detected or the license doesn't allow derivatives, warn the user:
> "Could not confirm this book's license allows derivative works. Please verify you have the right to create derivative works before proceeding."

Ask whether to continue.

### Step 4: Choose Output Type

Ask the user what they want to generate:

1. **Slash command** — A publishable Claude Code command (like /audit-oss)
2. **Avatar** — An avatar-sdk compatible config for knowledge avatars
3. **MCP server** — A standalone MCP server project with embedded book data

### Step 5: Analyze the Book

Analyze the book content to extract:
- **Summary**: 2-3 paragraph overview
- **Key principles**: 8-20 named principles with descriptions and source chapters
- **Frameworks/checklists**: Any structured processes, evaluation criteria, or step-by-step methods
- **Expertise areas**: What domains the book covers
- **Tone**: The author's writing style
- **Audience level**: beginner/intermediate/advanced/expert
- **Primary action**: What the book helps readers DO (e.g., manage, evaluate, design)
- **Command type**: audit (if checklists/criteria found), advisory (how-to), consult (theory), generate (creating things)

Show the analysis summary and ask the user to review:
> "Here's what I extracted. Please review and let me know if anything needs correction:"
>
> **Principles ({count}):** {list first 5 names}...
> **Frameworks ({count}):** {list names}
> **Suggested command name:** `{name}` ({type})
> **Tone:** {tone}

### Step 6: Generate Output

Based on the chosen output type:

**For slash command:**
- Generate the command .md file (following the audit-oss pattern: arguments, 6-step workflow, scoring template)
- Generate the reference data .md file (checklist items from frameworks, principles)
- Generate install.sh and install.ps1
- Generate README.md and LICENSE
- Write all files to `book-power-output/command/{slug}/`

**For avatar:**
- Generate config.json matching avatar-sdk's avatar-schema.json
- Generate corpus/sources.json matching SourcesManifest type
- Set up systemPrompt with "student framing" (not impersonation)
- Write to `book-power-output/avatar/{slug}/`

**For MCP server:**
- Generate package.json, tsconfig.json
- Generate src/data.ts with embedded book content (chapters, principles, frameworks)
- Generate src/index.ts with MCP server (tools: search_content, get_chapter, get_principles, get_frameworks, get_book_info)
- Write to `book-power-output/mcp/{slug}/`

### Step 7: Offer Next Steps

After generating:

**For slash command:**
> "Command generated! Next steps:"
> 1. "Review the files at `book-power-output/command/{slug}/`"
> 2. "To install locally: copy `{slug}.md` to `~/.claude/commands/` and `{slug}-reference.md` to `~/.claude/`"
> 3. "To publish: create a GitHub repo and push the files"

**For avatar:**
> "Avatar config generated! Next steps:"
> 1. "Review config.json at `book-power-output/avatar/{slug}/`"
> 2. "Copy to your avatar-sdk `avatars/` directory"
> 3. "Run the processor to create embeddings"

**For MCP server:**
> "MCP server generated! Next steps:"
> 1. "cd `book-power-output/mcp/{slug}` && npm install && npm run build"
> 2. "Add to your Claude settings as an MCP server"
> 3. "Test with: `node dist/index.js`"

Ask: "Want me to install/set up any of these now?"

## Notes

- This command does NOT require an ANTHROPIC_API_KEY — Claude Code handles all analysis
- For the CLI version that uses the API directly, use `npx tsx book-power/src/cli.ts process <source> --output <format>`
- Source: [book-power](https://github.com/zhiganov/book-power)
