#!/bin/bash
# Install book-power slash command for Claude Code

set -e

REPO_URL="https://raw.githubusercontent.com/zhiganov/book-power/main"
CLAUDE_DIR="$HOME/.claude"

echo "Installing book-power slash command..."

# Create directories
mkdir -p "$CLAUDE_DIR/commands"

# Download command file
curl -fsSL "$REPO_URL/slash-command/book-power.md" -o "$CLAUDE_DIR/commands/book-power.md"
echo "✓ Installed book-power.md → ~/.claude/commands/"

echo ""
echo "Installation complete! Use /book-power in Claude Code to get started."
