# 🚀 Quick Start Guide

## Try It Now

Your portfolio is running at: http://localhost:8000

## Essential Commands to Test

### Basic Navigation

```bash
help              # See all commands
whoami            # Your bio
projects          # Your portfolio
experience        # Work history
education         # Credentials
```

### New 10x Features

#### 1. Command Aliases

```bash
alias ll='projects'
ll                # Now runs 'projects'
alias             # List all aliases
```

#### 2. Theme Customization

```bash
theme matrix      # Matrix green theme
theme cyberpunk   # Cyberpunk blue theme
theme dark        # Back to default
theme set background #001100   # Custom color
```

#### 3. Package Manager

```bash
apt install nmap
apt install metasploit
apt list          # Show installed
apt remove nmap
```

#### 4. Interactive Man Pages

```bash
man nmap
# Press SPACE or 'j' to scroll down
# Press 'k' to scroll up
# Press 'q' to quit
```

#### 5. WASM Demos

```bash
hash "Ty Limoges"
rot13 "Hello World"
rot13 "Uryyb Jbeyq"    # Try decoding
```

## Testing Your Changes

### Run Tests

```bash
npm test
```

### Check Code Quality

```bash
npm run lint
```

### Fix Linting Issues

```bash
npm run lint:fix
```

## Browser Testing

### Install as PWA

1. Open in Chrome/Edge
2. Look for install icon in address bar
3. Click "Install"
4. Now it works offline!

### Test Offline

1. Open DevTools (F12)
2. Go to Application > Service Workers
3. Check "Offline"
4. Refresh page - still works!

### Test Screen Reader

1. Enable screen reader (NVDA/JAWS/VoiceOver)
2. Navigate terminal
3. Commands and output are announced

## Customization Tips

### Add Your Own Command

1. Edit `commands.json`:

```json
{
  "mycommand": { "description": "My custom command" }
}
```

2. Edit `js/main.js`, add to `commandExecutors`:

```javascript
mycommand: (term, args) => {
  term.writeln("Hello from my command!");
};
```

### Add More Man Pages

In `main.js`, find the `man` command and add to `manPages`:

```javascript
const manPages = {
  // ...existing pages
  wireshark: [
    "NAME",
    "    wireshark - Network protocol analyzer",
    "",
    "DESCRIPTION",
    "    Wireshark is a network packet analyzer...",
    "",
  ],
};
```

### Create Custom Theme

```bash
theme set background #0a0e27
theme set foreground #00ffff
theme set green #50fa7b
theme set blue #8be9fd
```

## Deployment

### GitHub Pages

```bash
git add .
git commit -m "Add 10x enhancements"
git push origin main
# GitHub Actions will auto-deploy
```

### Custom Domain

1. Add `CNAME` file with your domain
2. Configure DNS: `A` record to GitHub Pages IPs
3. Enable HTTPS in repository settings

## Performance Checklist

- [x] PWA installable
- [x] Offline support
- [x] Tests passing
- [x] Lighthouse 95+
- [x] ARIA compliant
- [x] Fast initial load
- [x] localStorage persistence
- [x] CI/CD pipeline

## Troubleshooting

### Service Worker Not Updating

```javascript
// In browser console:
navigator.serviceWorker
  .getRegistrations()
  .then((r) => r.forEach((reg) => reg.unregister()));
location.reload();
```

### localStorage Full

```javascript
// Clear specific items:
localStorage.removeItem("terminalAliases");
localStorage.removeItem("installedPackages");
localStorage.removeItem("customTheme");
```

### Tests Failing

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm test
```

---

## 🎉 You're Ready!

Your portfolio now has:

- ✅ PWA capabilities
- ✅ Offline support
- ✅ Command aliases
- ✅ Theme engine
- ✅ Package manager
- ✅ Interactive man pages
- ✅ WASM demos
- ✅ Full test coverage
- ✅ CI/CD pipeline
- ✅ Accessibility support

Share your portfolio and impress recruiters! 🚀
