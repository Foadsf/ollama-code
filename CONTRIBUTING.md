# Contributing to OLC

Thank you for your interest in contributing to OLC! This guide will help you get started.

## Code of Conduct

This project follows the [Contributor Covenant](https://www.contributor-covenant.org/). Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## Development Setup

### Prerequisites

- Node.js 18+
- Ollama with a code model
- Git

### Setup Process

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/your-username/olc.git
   cd olc
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run tests to ensure everything works**
   ```bash
   npm test
   ```

4. **Start development mode**
   ```bash
   npm run dev
   ```

## Development Guidelines

### Code Style

- Use ESLint configuration provided
- Follow existing code patterns
- Write meaningful commit messages
- Add JSDoc comments for public functions

### Testing Requirements

- All new features must include tests
- Maintain >90% code coverage
- Include both unit and integration tests
- Test security-sensitive code thoroughly

### Security Considerations

- Never commit secrets or credentials
- Follow secure coding practices
- Test with all security profiles
- Document security implications

## Contribution Types

### Bug Reports

Use the bug report template and include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details
- Relevant logs

### Feature Requests

Use the feature request template and include:
- Problem statement
- Proposed solution
- Alternative solutions considered
- Implementation plan

### Code Contributions

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow coding standards
   - Add tests
   - Update documentation

3. **Commit your changes**
   ```bash
   git commit -m "feat: add awesome new feature"
   ```

4. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

## Pull Request Process

1. Ensure all tests pass
2. Update documentation
3. Add changelog entry
4. Request review from maintainers
5. Address feedback promptly

### PR Title Format

Use conventional commits:
- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation
- `test:` for testing improvements
- `refactor:` for code refactoring

## Architecture Guidelines

### Tool Development

When adding new tools:

1. **Follow the tool interface**
   ```javascript
   export async function yourTool(args) {
       // Validate arguments
       // Perform security checks
       // Execute operation
       // Return structured result
   }
   ```

2. **Add comprehensive tests**
3. **Update tool registry**
4. **Document security implications**
5. **Add to integration tests**

### Self-Improvement Engine

When modifying the self-improvement engine:

1. **Maintain safety-first approach**
2. **Add extensive validation**
3. **Test rollback mechanisms**
4. **Document improvement patterns**

### Security Framework

Security-related changes require:

1. **Security review from maintainers**
2. **Penetration testing**
3. **Documentation updates**
4. **Backward compatibility considerations**

## Testing Guidelines

### Unit Tests

```javascript
// tests/unit/tools/yourTool.test.js
import { jest } from '@jest/globals';
import { yourTool } from '../../../src/tools/yourTool.js';

describe('yourTool', () => {
    test('should handle valid input', async () => {
        const result = await yourTool({ param: 'value' });
        expect(result).toBeDefined();
    });

    test('should reject invalid input', async () => {
        await expect(yourTool({})).rejects.toThrow();
    });
});
```

### Integration Tests

```javascript
// tests/integration/workflow.test.js
describe('Tool Integration', () => {
    test('should execute multi-tool workflow', async () => {
        // Test realistic usage scenarios
    });
});
```

### Security Tests

```javascript
// tests/security/permissions.test.js
describe('Permission System', () => {
    test('should block dangerous operations', async () => {
        // Test security controls
    });
});
```

## Documentation Standards

### JSDoc Comments

```javascript
/**
 * Brief description of the function
 * @param {Object} args - Function arguments
 * @param {string} args.param - Parameter description
 * @returns {Promise<Object>} - Return value description
 * @throws {Error} - When validation fails
 * @example
 * const result = await yourFunction({ param: 'value' });
 */
export async function yourFunction(args) {
    // Implementation
}
```

### README Updates

When adding features:
1. Update feature list
2. Add usage examples
3. Update configuration options
4. Add troubleshooting info

## Release Process

### Version Management

We follow [Semantic Versioning](https://semver.org/):
- MAJOR: Breaking changes
- MINOR: New features (backward compatible)
- PATCH: Bug fixes

### Changelog

Update CHANGELOG.md with:
- New features
- Bug fixes
- Breaking changes
- Migration guides

## Getting Help

### Communication Channels

- **Questions**: GitHub Discussions
- **Bugs**: GitHub Issues
- **Security**: security@olc-project.org
- **Chat**: Discord server

### Mentorship

New contributors can request mentorship:
1. Comment on issues marked "good first issue"
2. Join our Discord for real-time help
3. Attend monthly contributor meetings

## Recognition

Contributors are recognized through:
- AUTHORS file listing
- Release notes mentions
- Annual contributor awards
- Conference speaking opportunities

Thank you for contributing to OLC!
