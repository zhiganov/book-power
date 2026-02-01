# Install book-power slash command for Claude Code

$ErrorActionPreference = "Stop"

$RepoUrl = "https://raw.githubusercontent.com/zhiganov/book-power/main"
$ClaudeDir = "$env:USERPROFILE\.claude"

Write-Host "Installing book-power slash command..."

# Create directories
New-Item -ItemType Directory -Force -Path "$ClaudeDir\commands" | Out-Null

# Download command file
Invoke-WebRequest -Uri "$RepoUrl/slash-command/book-power.md" -OutFile "$ClaudeDir\commands\book-power.md"
Write-Host "✓ Installed book-power.md → ~/.claude/commands/"

Write-Host ""
Write-Host "Installation complete! Use /book-power in Claude Code to get started."
