#!/bin/bash
# Install {{COMMAND_NAME}} for Claude Code

set -e

REPO_URL="https://raw.githubusercontent.com/{{GITHUB_USER}}/{{REPO_NAME}}/main"
CLAUDE_DIR="$HOME/.claude"

echo "Installing {{COMMAND_NAME}}..."

# Create directories
mkdir -p "$CLAUDE_DIR/commands"

# Download command file
curl -fsSL "$REPO_URL/{{COMMAND_FILE}}" -o "$CLAUDE_DIR/commands/{{COMMAND_FILE}}"
echo "✓ Installed {{COMMAND_FILE}} → ~/.claude/commands/"

# Download data file(s)
{{DATA_FILE_DOWNLOADS}}

echo ""
echo "Installation complete! Use /{{COMMAND_SLUG}} in Claude Code to get started."
