# Tyler Limoges - Interactive Terminal Portfolio

> 🎓 **Student Portfolio** | Career Pivot: Healthcare → Cybersecurity  
> SNHU Computer Science (Cybersecurity Focus) | Junior | 3.9 GPA | Expected Graduation: May 2026

![Version](https://img.shields.io/badge/version-6.0.0-green)
![Tests](https://img.shields.io/badge/tests-passing-brightgreen)
![PWA](https://img.shields.io/badge/PWA-enabled-blue)
![License](https://img.shields.io/badge/license-MIT-blue)
![Portfolio Grade](<https://img.shields.io/badge/portfolio-B+%20(83%2F100)-blue>)

An interactive terminal-based portfolio showcasing my journey from **Anesthesia Technician** to aspiring **Red Team Operator**. Built with modern web technologies to demonstrate both security knowledge and development skills.

## 👨‍💻 About This Portfolio

This isn't just a resume—it's a **working demonstration** of my technical abilities:

- **🏗️ Built from scratch** using vanilla JavaScript, xterm.js, and modern web standards
- **🤖 AI-powered advisor** using Hugging Face Transformers.js for career guidance
- **📚 5 published research articles** with 162+ citations (Red Team Playbook, Certification Roadmap, etc.)
- **💻 ~18,000 lines of C code** in my Syn_OS kernel project
- **✅ Test-driven development** with Vitest (13/13 passing)
- **♿ Accessibility-first** design with ARIA labels and semantic HTML

**Portfolio Grade: B+ (83/100)** — Path to A- documented in AI advisor

## 🚀 Features

### Core Functionality

- **Interactive Terminal**: Full-featured terminal emulator using xterm.js
- **Command System**: 30+ custom commands for exploring portfolio content
- **Command History**: Navigate with ↑/↓ arrow keys
- **Tab Completion**: Autocomplete command names
- **URL Linking**: Deep link to specific commands via hash (#command)

### 10x Developer Enhancements

#### 1. 🤖 AI-Powered Career Advisor (NEW!)

```bash
advisor                    # Full career summary
advisor what's next?       # Get specific advice
advisor status             # Quick portfolio check
```

- **Intelligent coaching** powered by Hugging Face
- **20+ contextual responses** for career questions
- **Portfolio-aware**: Knows your grade, strengths, gaps
- **Natural language**: Ask questions your way
- **Topics covered**: CTF write-ups, certifications, tools, jobs, AI research

[Read full AI Advisor Guide →](AI_ADVISOR_GUIDE.md)

#### 2. Progressive Web App (PWA)

- Installable on desktop and mobile devices
- Offline support via service worker
- Cached assets for instant loading
- Native app-like experience

#### 3. Command Aliases

```bash
alias ll='projects'
alias bio='whoami'
```

- Create custom command shortcuts
- Persisted in localStorage across sessions

#### 3. Theme Customization

```bash
theme dark          # Apply preset
theme matrix        # Matrix-style theme
theme set background #000020  # Custom colors
```

- 4 built-in presets (dark, light, matrix, cyberpunk)
- Custom color configuration
- Persistent storage of preferences

#### 4. Package Manager Simulation

```bash
apt install nmap
apt list
apt remove wireshark
```

- Install/remove security tools
- State persisted in localStorage
- Available packages: nmap, wireshark, metasploit, burpsuite, ghidra

#### 5. Interactive Man Pages

```bash
man nmap
```

- Less-like pager with keyboard controls
- `space`/`j` - scroll down
- `k` - scroll up
- `q` - quit
- Displays one screen at a time

#### 6. Accessibility (a11y)

- ARIA roles and attributes
- `aria-live="polite"` for screen readers
- Semantic HTML structure
- Keyboard navigation support

#### 7. CI/CD Pipeline

- Automated linting with ESLint
- Unit tests with Vitest
- Auto-deployment to GitHub Pages
- Test coverage reporting

#### 8. Testing Suite

- Unit tests for command parser
- History navigation tests
- Autocomplete logic tests
- Run with `npm test`

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/TLimoges33/terminal-portfolio.git
cd terminal-portfolio

# Install dependencies
npm install

# Start development server
npm run serve
```

Visit `http://localhost:8000`

## 🧪 Development

### Running Tests

```bash
# Run tests once
npm test

# Watch mode
npm run test:watch

# UI mode
npm run test:ui
```

### Linting

```bash
# Check for errors
npm run lint

# Auto-fix issues
npm run lint:fix
```

### Building for Production

```bash
# Static site - copy all files to your hosting provider
# Ensure service worker path is correct for your domain
```

## 📋 Available Commands

| Command      | Description                               |
| ------------ | ----------------------------------------- |
| `help`       | Show all available commands               |
| `whoami`     | Display bio and background                |
| `projects`   | View portfolio projects                   |
| `experience` | Professional work history                 |
| `education`  | Academic credentials and certifications   |
| `toolkit`    | List technical skills and tools           |
| `philosophy` | Core principles and approach              |
| `roadmap`    | Career development path                   |
| `hireme`     | Contact information and value proposition |
| `alias`      | Create command shortcuts                  |
| `theme`      | Customize terminal appearance             |
| `apt`        | Package manager simulation                |
| `man`        | Interactive manual pages                  |
| `clear`      | Clear the terminal                        |
| `print`      | Print terminal output                     |

Plus many more! Type `help` to see the full list.

## 🎨 Customization

### Adding New Commands

Edit `js/main.js` and add to `commandExecutors`:

```javascript
commandExecutors = {
  // ...existing commands
  mycommand: (term, args) => {
    term.writeln("Hello from my custom command!");
  },
};
```

Add the command description to `commands.json`:

```json
{
  "mycommand": { "description": "My custom command description" }
}
```

### Creating Themes

```javascript
const presets = {
  mytheme: {
    background: "#1a1a2e",
    foreground: "#eaeaea",
    green: "#50fa7b",
    // ...other colors
  },
};
```

## 🚢 Deployment

### GitHub Pages

1. Enable GitHub Pages in repository settings
2. Push to `main` branch
3. GitHub Actions will auto-deploy

### Other Platforms

- **Netlify**: Drop the folder or connect to GitHub
- **Vercel**: Import repository and deploy
- **Custom Server**: Serve static files from any web server

## 🏗️ Architecture

```
├── index.html           # Main entry point with PWA setup
├── manifest.json        # PWA manifest for installation
├── sw.js               # Service worker for offline support
├── commands.json       # Command metadata
├── package.json        # Dependencies and scripts
├── css/
│   └── style.css       # Terminal styling
├── js/
│   └── main.js         # Terminal logic and commands
├── tests/
│   └── terminal.test.js # Unit tests
├── .github/
│   └── workflows/
│       └── deploy.yml  # CI/CD pipeline
└── README.md           # This file
```

## 🔧 Technologies

- **xterm.js** - Terminal emulator
- **Vanilla JavaScript** - No framework dependencies
- **Vitest** - Fast unit testing
- **ESLint** - Code quality
- **GitHub Actions** - CI/CD
- **Service Workers** - PWA offline support

## 📊 Performance

- **Lighthouse Score**: 95+
- **First Contentful Paint**: < 1s
- **Time to Interactive**: < 2s
- **Total Bundle Size**: < 50KB (excluding CDN assets)

## 🎓 Student Project Context

This portfolio represents my transition from **5+ years in critical healthcare** (Level 1 Trauma Center anesthesia) to **cybersecurity**. It demonstrates:

### Technical Skills Acquired:

- **Systems Programming**: ~18,000 lines of kernel C code (memory management, schedulers, IPC)
- **Web Development**: Modern JavaScript, PWA architecture, service workers
- **Testing & CI/CD**: Test-driven development, automated deployment
- **Security Research**: 5 published articles, Red Team methodology, certification analysis

### Unique Value Proposition:

- **Critical Infrastructure Experience**: HIPAA compliance, high-stress environment management
- **Leadership**: Trained 13 anesthesia technicians, team coordination
- **Work Ethic**: Balancing full-time healthcare + full-time student (3.9 GPA)
- **Self-Taught**: Built this portfolio from scratch while learning OS development

### Career Goals:

- **Immediate**: Network+ (Nov 2025) → Security+ (Dec 2025) → eJPT (Q1 2026)
- **12 Months**: OSCP certification, junior penetration tester role
- **Long-term**: Red Team Operator specializing in Active Directory & adversary emulation

**Why hire a career pivoter?** Fresh perspective, proven learning ability, real-world crisis management, and genuine passion for the field.

## 🤝 Contributing

While this is a personal portfolio, feedback and suggestions are welcome! Open an issue or submit a pull request.

## 📄 License

MIT License - feel free to use this as a template for your own portfolio.

## 👤 Author

**Tyler Limoges**

- GitHub: [@TLimoges33](https://github.com/TLimoges33)
- LinkedIn: [tylerlimoges](https://linkedin.com/in/tylerlimoges)
- Portfolio: [TLimoges33.github.io/terminal-portfolio](https://TLimoges33.github.io/terminal-portfolio/)

---

Built with ❤️ and ☕ by Tyler Limoges
