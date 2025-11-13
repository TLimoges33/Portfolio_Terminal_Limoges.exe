# Contributing to Terminal Portfolio

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## 🎯 Project Vision

This terminal-based portfolio showcases cybersecurity expertise through an interactive command-line interface. Contributions should align with this vision while maintaining code quality, security, and performance.

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **Git** for version control
- Modern browser (Chrome 90+, Firefox 88+, Safari 14+)
- Basic understanding of:
  - Vanilla JavaScript (ES6+)
  - Terminal/CLI interfaces
  - Progressive Web Apps (PWAs)

### Setup Development Environment

```bash
# Fork the repository on GitHub first, then:

# Clone your fork
git clone https://github.com/YOUR_USERNAME/terminal-portfolio.git
cd terminal-portfolio

# Install dependencies
npm install

# Run tests
npm test

# Start local development server
npm run serve
# Open http://localhost:8000
```

## 📋 How to Contribute

### Types of Contributions

We welcome:

1. **Bug Fixes**: Fix existing issues or broken functionality
2. **New Commands**: Add useful terminal commands
3. **Performance Improvements**: Optimize loading, caching, or rendering
4. **Security Enhancements**: Improve CSP, sanitization, or security features
5. **Documentation**: Improve README, code comments, or guides
6. **Tests**: Add or improve test coverage
7. **Accessibility**: Enhance ARIA labels, keyboard navigation, screen reader support

### Before You Start

1. **Check existing issues** - Someone might already be working on it
2. **Create an issue** - Discuss your idea before spending time coding
3. **Get feedback** - Maintainers can guide you in the right direction

## 🔧 Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

**Branch naming conventions:**

- `feature/` - New features or enhancements
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `test/` - Test additions or modifications
- `refactor/` - Code refactoring without feature changes

### 2. Make Your Changes

#### Code Style

- **JavaScript**: Follow existing ES6+ patterns
- **Indentation**: 2 spaces
- **Quotes**: Single quotes for strings
- **Semicolons**: Required
- **Comments**: Use JSDoc for functions

Example:

```javascript
/**
 * Execute a terminal command
 * @param {Object} term - Terminal instance
 * @param {Array} args - Command arguments
 * @returns {Promise<void>}
 */
const executeCommand = async (term, args) => {
  // Implementation
};
```

#### Adding a New Command

1. **Define in `js/data/commands.json`:**

```json
{
  "mycommand": {
    "description": "Brief description of what it does",
    "usage": "mycommand [options]"
  }
}
```

2. **Implement in `js/main.js`:**

```javascript
const commandExecutors = {
  // ... existing commands
  mycommand: (term, args) => {
    term.writeln("\x1b[1;32mYour output here\x1b[0m");

    // Handle arguments
    if (args.length === 0) {
      term.writeln("Usage: mycommand <arg>");
      return;
    }

    // Your logic here
  },
};
```

3. **Add tests in `tests/commands.test.js`:**

```javascript
describe("mycommand", () => {
  it("should execute successfully", () => {
    const mockTerm = new MockTerminal();
    commandExecutors.mycommand(mockTerm, []);
    expect(mockTerm.getOutput()).toContain("expected text");
  });

  it("should handle arguments", () => {
    const mockTerm = new MockTerminal();
    commandExecutors.mycommand(mockTerm, ["arg1"]);
    expect(mockTerm.getOutput()).toContain("arg1");
  });
});
```

### 3. Write Tests

**All new features must include tests.**

```bash
# Run tests
npm test

# Run in watch mode
npm run test:watch

# Run with UI
npm run test:ui
```

**Test Coverage Requirements:**

- New commands: 100% coverage
- Bug fixes: Add regression tests
- Refactors: Maintain existing coverage

### 4. Lint Your Code

```bash
# Check for issues
npm run lint

# Auto-fix
npm run lint:fix
```

### 5. Test Locally

```bash
# Start server
npm run serve

# Test in browser:
# - Open http://localhost:8000
# - Test all affected commands
# - Check console for errors
# - Verify responsive design (mobile/desktop)
# - Test keyboard shortcuts
```

### 6. Commit Your Changes

Use **conventional commits** format:

```bash
git commit -m "feat: add new command for displaying certifications"
git commit -m "fix: resolve XSS vulnerability in input handling"
git commit -m "docs: update README with new commands"
git commit -m "test: add tests for export functionality"
```

**Commit types:**

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `test:` - Test additions or changes
- `refactor:` - Code refactoring
- `perf:` - Performance improvements
- `style:` - Code style changes (formatting)
- `chore:` - Build process or auxiliary tool changes

### 7. Push and Create Pull Request

```bash
# Push to your fork
git push origin feature/your-feature-name

# Create PR on GitHub
# - Use a descriptive title
# - Reference related issues (#123)
# - Describe what changed and why
# - Include screenshots for UI changes
```

## ✅ Pull Request Checklist

Before submitting, ensure:

- [ ] Code follows existing style patterns
- [ ] All tests pass (`npm test`)
- [ ] No linting errors (`npm run lint`)
- [ ] New features have tests
- [ ] Documentation updated (if needed)
- [ ] Commit messages follow conventional format
- [ ] PR description is clear and complete
- [ ] Tested locally in multiple browsers
- [ ] No console errors or warnings
- [ ] Security implications considered

## 🔒 Security Considerations

This is a **security-focused portfolio**. All contributions must maintain:

1. **Input Sanitization**: Never use `eval()` or `innerHTML` with user input
2. **CSP Compliance**: Ensure changes don't violate Content Security Policy
3. **XSS Prevention**: Properly escape all output
4. **No External Scripts**: Use CDNs only for established libraries (xterm.js)
5. **Dependency Management**: Minimal dependencies, audit all additions

**Report security vulnerabilities privately** - Do not open public issues.

## 🧪 Testing Guidelines

### Test Structure

```javascript
describe("Feature Name", () => {
  beforeEach(() => {
    // Setup
  });

  describe("Specific Functionality", () => {
    it("should do something specific", () => {
      // Arrange
      const input = "test";

      // Act
      const result = functionUnderTest(input);

      // Assert
      expect(result).toBe("expected");
    });
  });
});
```

### What to Test

- **Happy path**: Normal expected usage
- **Edge cases**: Empty inputs, extremes, special characters
- **Error handling**: Invalid inputs, network failures
- **Security**: XSS attempts, injection attacks
- **Performance**: Large datasets, repeated operations

## 📚 Documentation Standards

### Code Comments

```javascript
// Bad
// Loop through items
items.forEach(item => { ... });

// Good
// Process each command history item, limiting to last 50 entries
// to prevent localStorage overflow (5MB limit)
items.slice(-50).forEach(item => { ... });
```

### README Updates

When adding significant features:

1. Update feature list
2. Add to command reference
3. Include usage examples
4. Update architecture diagram (if applicable)

## 🎨 Design Principles

1. **Terminal-First**: Everything must work via command line
2. **No Frameworks**: Vanilla JavaScript maintains simplicity
3. **Offline-Capable**: Service worker should cache new features
4. **Accessible**: ARIA labels, keyboard navigation
5. **Fast**: Optimize for performance (< 2s interactive)
6. **Secure**: Follow security best practices

## 🐛 Reporting Bugs

### Create a Good Bug Report

Include:

1. **Description**: What went wrong?
2. **Steps to reproduce**: Exact commands/actions
3. **Expected behavior**: What should happen?
4. **Actual behavior**: What actually happened?
5. **Environment**:
   - Browser & version
   - OS
   - Device (mobile/desktop)
6. **Screenshots**: If applicable
7. **Console errors**: Copy full error messages

### Example

```markdown
**Bug**: `stats` command crashes on fresh install

**Steps to reproduce:**

1. Clear localStorage
2. Reload page
3. Type `stats`
4. Press Enter

**Expected**: Display "No statistics yet" message

**Actual**: JavaScript error in console

**Environment:**

- Chrome 120.0.6099
- Windows 11
- Desktop

**Console Error:**
```

TypeError: Cannot read property 'whoami' of undefined

```

## 💬 Communication

- **GitHub Issues**: Bug reports, feature requests
- **Pull Requests**: Code contributions
- **Discussions**: General questions, ideas

## 📜 Code of Conduct

### Our Standards

- **Be respectful**: Treat all contributors with respect
- **Be constructive**: Provide helpful feedback
- **Be inclusive**: Welcome newcomers
- **Be professional**: Focus on the code, not the person

### Unacceptable Behavior

- Harassment or discrimination
- Trolling or insulting comments
- Spam or off-topic content
- Publishing others' private information

## 🏆 Recognition

Contributors will be:

- Listed in `CONTRIBUTORS.md`
- Mentioned in release notes
- Given credit in documentation

## 📝 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

## Questions?

- **Documentation**: Check [README.md](README.md) and [docs/](documentation/)
- **Issues**: Search existing issues or create new one
- **Contact**: Tyler Limoges - [GitHub](https://github.com/TLimoges33)

---

**Thank you for contributing to Terminal Portfolio! 🚀**

*Together, we're building a showcase of cybersecurity excellence through clean code and thoughtful design.*
```
