# Install {{COMMAND_NAME}} for Claude Code

$ErrorActionPreference = "Stop"

$RepoUrl = "https://raw.githubusercontent.com/{{GITHUB_USER}}/{{REPO_NAME}}/main"
$ClaudeDir = "$env:USERPROFILE\.claude"

Write-Host "Installing {{COMMAND_NAME}}..."

# Create directories
New-Item -ItemType Directory -Force -Path "$ClaudeDir\commands" | Out-Null

# Download command file
Invoke-WebRequest -Uri "$RepoUrl/{{COMMAND_FILE}}" -OutFile "$ClaudeDir\commands\{{COMMAND_FILE}}"
Write-Host "✓ Installed {{COMMAND_FILE}} → ~/.claude/commands/"

# Download data file(s)
{{DATA_FILE_DOWNLOADS}}

Write-Host ""
Write-Host "Installation complete! Use /{{COMMAND_SLUG}} in Claude Code to get started."
