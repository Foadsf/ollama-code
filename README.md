# OLC (Ollama Code) - AI-Powered Local Development Assistant

[![npm version](https://badge.fury.io/js/olc.svg)](https://badge.fury.io/js/olc)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js CI](https://github.com/your-org/olc/workflows/Node.js%20CI/badge.svg)](https://github.com/your-org/olc/actions)

**OLC** is a powerful, privacy-first AI coding assistant that runs entirely on your local machine using Ollama. Unlike cloud-based alternatives, OLC keeps your code secure while providing intelligent assistance for development, debugging, and code improvement.

## 🌟 Key Features

### 🔒 Privacy & Security First
- **100% Local**: All AI processing happens on your machine
- **Security Profiles**: Configurable security levels (strict/moderate/permissive)
- **Audit Logging**: Complete trail of all operations
- **Permission System**: Granular control over tool access

### 🤖 Self-Improving AI Assistant
- **Autonomous Code Analysis**: Continuously analyzes and improves your codebase
- **Smart Recommendations**: AI-powered suggestions for performance, security, and maintainability
- **Automated Refactoring**: Safe, tested code improvements with rollback capability
- **Learning System**: Adapts to your coding patterns and preferences

### 🛠️ Comprehensive Tool Suite
- **File Operations**: Read, edit, create files with intelligent caching
- **Shell Integration**: Safe command execution with security validation
- **Git Management**: Full Git workflow automation
- **Package Management**: npm/yarn/pnpm integration
- **Database Tools**: Query and manage databases
- **Search & Navigation**: Advanced code search and pattern matching

### ⚡ Performance Optimized
- **Intelligent Caching**: AI responses and file operations cached for speed
- **Memory Management**: Smart conversation history compression
- **Progress Tracking**: Detailed progress indicators for long operations
- **Resource Monitoring**: Built-in performance profiling and diagnostics

## 🚀 Quick Start

### Prerequisites

1. **Node.js 18+**
   ```bash
   node --version  # Should be 18.0.0 or higher
   ```

2. **Ollama** with a code model
   ```bash
   # Install Ollama
   curl -fsSL https://ollama.com/install.sh | sh

   # Start Ollama service
   ollama serve

   # Download a code model
   ollama pull codellama:13b  # or deepseek-coder, starcoder, etc.
   ```

### Installation

```bash
# Install globally
npm install -g olc

# Or install locally
npm install olc
```

### First Steps

```bash
# Test your setup
olc --version

# Run health check
olc /health

# Start interactive session
olc

# Ask a question directly
olc "How can I optimize this React component?"
```

## 📖 Usage Guide

### Interactive Mode

The REPL (Read-Eval-Print Loop) is the primary interface:

```bash
$ olc
🚀 Ollama Code - AI-powered coding assistant

Type your questions or commands, or use /help to see available commands
Press Ctrl+C to exit

🚀> analyze my React components for performance issues
```

### Command Mode

For quick queries and automation:

```bash
# Single query
olc "explain this error" --print

# Process files
olc "review all TypeScript files for type safety"

# With specific model
olc "optimize this function" --model codellama:34b
```

### Slash Commands

In interactive mode, use `/` commands for special operations:

| Command | Description |
|---------|-------------|
| `/help` | Show all available commands |
| `/health` | Run system health check |
| `/improve` | Start self-improvement cycle |
| `/security status` | Show security profile and audit summary |
| `/performance profile` | Run performance analysis |
| `/clear` | Clear conversation history |
| `/config` | Manage configuration |
| `/exit` | Exit OLC |

## 🔧 Configuration

### Security Profiles

Choose your security level:

```bash
# Strict: Maximum security, explicit approval required
olc config set securityProfile strict

# Moderate: Balanced security and functionality (default)
olc config set securityProfile moderate

# Permissive: Minimal restrictions, auto-approval
olc config set securityProfile permissive
```

### Model Configuration

```bash
# Set your preferred model
olc config set ollamaModel codellama:13b

# Configure Ollama URL (if not default)
olc config set ollamaBaseUrl http://localhost:11434

# Adjust token limits
olc config set maxTokens 4096
```

### Project-Specific Settings

```bash
# Allow specific tools without prompts
olc config add allowedTools "BashTool(npm test)"
olc config add allowedTools "GitTool(commit)"

# Set ignore patterns
olc config add ignorePatterns "build/**"
olc config add ignorePatterns "*.log"
```

## 🛡️ Security Features

### Permission System

OLC requests permission for potentially dangerous operations:

```
Permission Request:
Allow executing shell command: npm install express
⚠️  CAUTION: Shell commands can modify your system

Grant permission? (y/N) y
Remember this decision?
  Just for this session
> Save to project config
  Don't remember
```

### Audit Logging

All operations are logged for security auditing:

```bash
# View recent audit summary
olc /security audit

# Show detailed audit log
cat .olc-audit.log
```

### Security Monitoring

```bash
# Check security status
olc /security status

# Generate security report
olc /diagnostics security
```

## 🔄 Self-Improvement Engine

OLC can analyze and improve its own codebase:

### Manual Improvement

```bash
# Start improvement cycle
olc /improve

# Improvement with specific focus
olc /improve --focus security
olc /improve --focus performance
```

### Automated Improvement

```bash
# Enable auto-improvement (use with caution)
olc config set autoImprove true
olc config set improvementSchedule daily
```

### Improvement Types

- **Security Fixes**: Vulnerability patching and security hardening
- **Performance Optimization**: Code efficiency improvements
- **Code Quality**: Refactoring for maintainability
- **Test Coverage**: Automatic test generation
- **Documentation**: README and comment improvements

## 📊 Monitoring & Diagnostics

### Health Monitoring

```bash
# Quick health check
olc /health

# Detailed diagnostic report
olc /diagnostics full

# Performance profiling
olc /performance profile
```

### Performance Metrics

```bash
# Cache statistics
olc /cache stats

# Memory and resource usage
olc /system resources

# AI response performance
olc /ai benchmark
```

## 🏗️ Advanced Usage

### Tool Integration

OLC provides a rich set of tools for development tasks:

```javascript
// File operations
olc "read the package.json file and suggest optimizations"

// Git workflow
olc "create a feature branch for user authentication"
olc "review my changes and create a meaningful commit"

// Database management
olc "connect to my PostgreSQL database and analyze the user table"

// Package management
olc "audit my dependencies for security vulnerabilities"
```

### Workflow Automation

```bash
# Create project setup workflow
olc "initialize a new Express.js project with TypeScript and testing"

# Code review workflow
olc "review all files changed in the last commit for issues"

# Deployment preparation
olc "prepare this project for production deployment"
```

### Custom Development Workflows

```bash
# Test-driven development
olc "write tests for this function, then improve the implementation"

# Documentation generation
olc "generate comprehensive API documentation for this module"

# Performance optimization
olc "profile this application and suggest performance improvements"
```

## 🔌 Plugin System

Extend OLC with custom tools and functionality:

```bash
# Install plugins
olc plugin install olc-docker-tools
olc plugin install olc-aws-integration

# List available plugins
olc plugin list

# Create custom plugin
olc plugin create my-custom-tool
```

## 🚀 Deployment & Distribution

### Docker Support

```dockerfile
FROM node:18-alpine
RUN npm install -g olc
COPY . /workspace
WORKDIR /workspace
CMD ["olc", "server", "--port", "3000"]
```

### CI/CD Integration

```yaml
# .github/workflows/olc-analysis.yml
name: OLC Code Analysis
on: [push, pull_request]
jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup OLC
        run: |
          npm install -g olc
          olc config set securityProfile strict
      - name: Analyze Code
        run: olc "analyze this codebase for issues" --format json > analysis.json
```

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Setup

```bash
# Clone repository
git clone https://github.com/your-org/olc.git
cd olc

# Install dependencies
npm install

# Run tests
npm test

# Start development mode
npm run dev
```

### Testing

```bash
# Run all tests
npm test

# Run specific test suite
npm run test:unit
npm run test:integration
npm run test:security

# Generate coverage report
npm run test:coverage
```

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [Full documentation](https://olc-docs.example.com)
- **Issues**: [GitHub Issues](https://github.com/your-org/olc/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/olc/discussions)
- **Security**: [Security Policy](SECURITY.md)

## 📈 Roadmap

- [ ] **Plugin Marketplace**: Official plugin repository
- [ ] **Cloud Sync**: Optional encrypted cloud backup
- [ ] **Team Collaboration**: Multi-user project support
- [ ] **IDE Integration**: VS Code, IntelliJ plugins
- [ ] **Mobile App**: iOS/Android companion app

---

**OLC - Empowering developers with local AI assistance while keeping code secure and private.**