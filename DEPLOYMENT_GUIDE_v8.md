# Deployment Guide - Syn_OS v8.0 Red Phoenix

## Current Status

All code is committed locally and ready to deploy. Tests passing: 73/73

## Step 1: Push to GitHub (Manual Token Update Required)

The automated push failed because the GitHub token needs `workflow` scope. Here's how to fix it:

### Option A: Update Token Permissions (Recommended)

1. Go to GitHub Settings: https://github.com/settings/tokens
2. Find your Personal Access Token
3. Edit and add the `workflow` scope
4. Run:
   ```bash
   git push --force origin main
   ```

### Option B: Remove CI/CD Workflow Temporarily

If you want to deploy without updating the token:

```bash
# Remove the workflow file
git rm .github/workflows/ci-cd.yml
git commit -m "Temporarily remove CI/CD workflow"
git push origin main

# You can add it back later via GitHub UI
```

## Step 2: Enable GitHub Pages

Once code is pushed:

1. Go to your repo: https://github.com/TLimoges33/Portfolio_Terminal_Limoges.exe
2. Click **Settings** tab
3. Scroll to **Pages** section (left sidebar)
4. Under **Source**, select:
   - Branch: `main`
   - Folder: `/ (root)`
5. Click **Save**
6. Wait 2-3 minutes for deployment

Your site will be live at:
**https://TLimoges33.github.io/Portfolio_Terminal_Limoges.exe/**

## Step 3: Verify Deployment

Test the following:

```bash
# Check if site is live
curl -I https://TLimoges33.github.io/Portfolio_Terminal_Limoges.exe/

# Visit in browser and test:
- Red/black theme loads
- Type 'about' to see v8.0 info
- Type 'theme classic' to test theme switching
- Type 'security' to see security report
- Try fuzzy autocomplete (type 'proj' then Tab)
```

## Step 4: Update Custom Domain (Optional)

If you want a custom domain:

1. Buy domain from Namecheap, GoDaddy, etc.
2. Add DNS records:

   ```
   Type: A
   Name: @
   Value: 185.199.108.153
          185.199.109.153
          185.199.110.153
          185.199.111.153

   Type: CNAME
   Name: www
   Value: TLimoges33.github.io
   ```

3. In GitHub Pages settings, add your custom domain
4. Enable "Enforce HTTPS"

## Step 5: Share Your Portfolio

### LinkedIn Post Template:

```
Just launched Syn_OS v8.0 - RED PHOENIX PROTOCOL

A major evolution in my portfolio's design philosophy:
- Pure red/black MSSP warfare platform aesthetic
- Offensive security positioning (not educational)
- Angular, tactical UI design
- Professional operations focus

Not learning security - operating a weapon system.

Live demo: https://TLimoges33.github.io/Portfolio_Terminal_Limoges.exe/

Try these commands:
- 'about' - See the v8.0 philosophy
- 'security' - View implementation details
- 'synos' - Deep dive into my 452k+ line OS project
- 'theme matrix' - Switch themes

Built with: xterm.js, vanilla JS, 73 passing tests, 9.5/10 security score

#Cybersecurity #RedTeam #Portfolio #WebDevelopment #SynOS
```

## Alternative Deployment Options

### Netlify (Auto-deploys from GitHub)

1. Go to https://app.netlify.com/
2. Click "Add new site" → "Import an existing project"
3. Connect to GitHub
4. Select `Portfolio_Terminal_Limoges.exe` repo
5. Deploy settings:
   - Build command: (leave empty)
   - Publish directory: `/`
6. Click "Deploy site"
7. You'll get: `random-name.netlify.app` (customizable)

### Vercel (Edge-optimized)

1. Go to https://vercel.com/
2. Click "Add New" → "Project"
3. Import `Portfolio_Terminal_Limoges.exe`
4. Deploy settings:
   - Framework: Other
   - Build: (leave empty)
   - Output: `./`
5. Click "Deploy"
6. You'll get: `portfolio-terminal.vercel.app`

### Cloudflare Pages (Global CDN)

1. Go to https://pages.cloudflare.com/
2. Click "Create a project"
3. Connect GitHub
4. Select repo
5. Build settings:
   - Build command: (empty)
   - Build output: `/`
6. Deploy
7. You'll get: `portfolio-terminal.pages.dev`

## Troubleshooting

### Issue: Site shows 404

**Solution**: Check that `index.html` is in the root directory

### Issue: Red theme not loading

**Solution**: Hard refresh (Ctrl+Shift+R) to clear cache

### Issue: Service Worker conflicts

**Solution**: Update version number in `sw.js` line 1:

```javascript
const CACHE_NAME = "terminal-portfolio-v8.0.0";
```

### Issue: Commands not working

**Solution**: Check browser console (F12) for errors. Ensure `js/data/commands.json` is accessible.

## Post-Deployment Checklist

- [ ] Site loads at GitHub Pages URL
- [ ] Red Phoenix theme displays correctly
- [ ] All commands work (test help, about, security, synos)
- [ ] Tab autocomplete functions
- [ ] Theme switching works
- [ ] Service worker registers (check Application tab in DevTools)
- [ ] PWA installable (look for install prompt)
- [ ] Mobile responsive (test on phone)
- [ ] Share on LinkedIn
- [ ] Update resume with live portfolio link

## Security Considerations

Your portfolio is now live and public. Security features active:

- Content Security Policy (CSP) headers
- Input sanitization (2000 char limit)
- Rate limiting (20 commands/10 seconds)
- No backend vulnerabilities (static site)
- HTTPS enforced by GitHub Pages
- Subresource Integrity on CDN assets

## Analytics (Optional)

To track visitors, add Google Analytics:

1. Create GA4 property at https://analytics.google.com/
2. Get Measurement ID (G-XXXXXXXXXX)
3. Add to `index.html` before `</head>`:

```html
<script
  async
  src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"
></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    dataLayer.push(arguments);
  }
  gtag("js", new Date());
  gtag("config", "G-XXXXXXXXXX");
</script>
```

## Performance Monitoring

Your portfolio includes Web Vitals tracking. To view:

1. Open browser DevTools (F12)
2. Go to Console
3. Type: `localStorage.getItem('webVitals')`
4. See LCP, FID, CLS, FCP, TTFB metrics

## Next Steps

1. Push code to GitHub (resolve token issue above)
2. Enable GitHub Pages
3. Test deployment
4. Share on LinkedIn
5. Add to resume
6. Monitor analytics

---

**Congratulations on v8.0 Red Phoenix!**

You've transformed from a blue educational portfolio to an aggressive red MSSP operations platform. This isn't just a theme - it's a philosophical shift in how you present yourself to the cybersecurity industry.

Welcome to the Red Phoenix era.
