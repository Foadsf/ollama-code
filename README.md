# olc

A FLOSS terminal-based AI coding assistant powered by Ollama.

## Overview

`olc` is a lightweight alternative to Claude Code that runs locally using Ollama models. It helps you understand, modify, and navigate your codebase through natural language commands, without sending your code to external servers.

## Features

- 🚀 Fast CLI-based AI coding assistant
- 🏠 Local inference with Ollama models
- 🛠️ File operations (read, edit, create)
- 🔍 Code search and navigation
- 🐚 Safe shell command execution
- 🔄 Git integration
- 🔐 Permission system for security

## Requirements

- Node.js 18+
- Ollama installed and running
- A code-focused model (codellama recommended)

## Installation

```bash
npm install -g olc
```

## Quick Start

```bash
# Start interactive mode in your project
olc

# Ask a direct question
olc "Explain how auth.js works"

# Configure
olc config set ollamaModel codellama
```

## Commands

| CLI Command | Description |
|-------------|-------------|
| `olc` | Start interactive REPL |
| `olc "query"` | Start with initial query |
| `olc -p "query"` | Process query and exit |
| `olc config` | Manage configuration |

## Interactive Commands

| Command | Description |
|---------|-------------|
| `/help` | Show available commands |
| `/clear` | Clear conversation history |
| `/compact` | Compact conversation |
| `/cost` | Show token usage |
| `/models` | List available models |
| `/exit` | Exit olc |

## Configuration

```bash
# Set model
olc config set ollamaModel codellama

# Set Ollama URL
olc config set ollamaBaseUrl http://localhost:11434

# Global settings
olc config set -g theme dark

# Allow commands without prompts
olc config add allowedTools "BashTool(npm test)"
```

## Security

- Tools that modify files or run commands require explicit permission
- Permissions can be granted once, for session, or permanently
- Operations restricted to project directory

## License

MIT