#!/bin/bash

# GitHub Repository Setup Script
# Run this AFTER creating the repository on GitHub

echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║           🚀 PORTFOLIO_TERMINAL GITHUB SETUP                      ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Must be run from /workspaces/codespaces-blank"
    exit 1
fi

echo "📋 Current Status:"
echo "   Repository: $(pwd)"
echo "   Git initialized: $(git rev-parse --git-dir 2>/dev/null && echo '✓' || echo '✗')"
echo "   Committed files: $(git log --oneline 2>/dev/null | wc -l) commit(s)"
echo ""

# Check if remote already exists
if git remote get-url origin >/dev/null 2>&1; then
    echo "⚠️  Remote 'origin' already exists:"
    git remote -v
    echo ""
    read -p "Remove existing remote and continue? (y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git remote remove origin
        echo "✓ Removed existing remote"
    else
        echo "❌ Aborted"
        exit 1
    fi
fi

echo "🔗 Adding GitHub remote..."
git remote add origin https://github.com/TLimoges33/Portfolio_Terminal.git

if [ $? -eq 0 ]; then
    echo "✓ Remote added successfully"
else
    echo "❌ Failed to add remote"
    exit 1
fi

echo ""
echo "🌿 Ensuring main branch..."
git branch -M main
echo "✓ Branch set to 'main'"

echo ""
echo "📤 Pushing to GitHub..."
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════════╗"
    echo "║                    ✅ SUCCESS!                                    ║"
    echo "╚═══════════════════════════════════════════════════════════════════╝"
    echo ""
    echo "🎉 Your portfolio is now on GitHub!"
    echo ""
    echo "📍 Repository URL:"
    echo "   https://github.com/TLimoges33/Portfolio_Terminal"
    echo ""
    echo "🚀 NEXT STEPS:"
    echo ""
    echo "1. Enable GitHub Pages:"
    echo "   → https://github.com/TLimoges33/Portfolio_Terminal/settings/pages"
    echo "   → Source: Deploy from a branch"
    echo "   → Branch: main"
    echo "   → Folder: / (root)"
    echo "   → Click 'Save'"
    echo ""
    echo "2. Your live site will be at:"
    echo "   → https://TLimoges33.github.io/Portfolio_Terminal/"
    echo "   (Wait 2-3 minutes for deployment)"
    echo ""
    echo "3. Add topics to your repo:"
    echo "   portfolio, terminal, xterm, javascript, cybersecurity, pwa"
    echo ""
    echo "4. Share it:"
    echo "   → LinkedIn: 'Just launched my terminal portfolio!'"
    echo "   → Resume: Add the GitHub link"
    echo "   → Job applications: Include in cover letter"
    echo ""
else
    echo ""
    echo "❌ Push failed. Common fixes:"
    echo ""
    echo "1. Make sure you created the repo on GitHub:"
    echo "   https://github.com/new"
    echo ""
    echo "2. Check the repo name is exactly: Portfolio_Terminal"
    echo ""
    echo "3. Try pushing manually:"
    echo "   git push -u origin main"
    echo ""
    exit 1
fi
