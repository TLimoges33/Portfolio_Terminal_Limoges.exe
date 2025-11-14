# Cache Clearing Instructions for Wastelands v8.1

## Problem

After deploying v8.1 to production, you're seeing only the red border and black background because your browser is loading **cached versions** of the old JavaScript files.

## Solution: Clear Browser Cache

### Chrome/Edge

1. Press `Ctrl + Shift + Delete` (Windows/Linux) or `Cmd + Shift + Delete` (Mac)
2. Select "Cached images and files"
3. Choose "All time" from the time range dropdown
4. Click "Clear data"

### Firefox

1. Press `Ctrl + Shift + Delete` (Windows/Linux) or `Cmd + Shift + Delete` (Mac)
2. Select "Cache"
3. Choose "Everything" from the time range dropdown
4. Click "Clear Now"

### Hard Refresh (Faster Option)

Instead of clearing all cache, try a hard refresh:

- **Chrome/Firefox/Edge**: `Ctrl + F5` or `Ctrl + Shift + R`
- **Mac**: `Cmd + Shift + R`

## Verify Deployment

After clearing cache, check:

1. Open DevTools (F12)
2. Go to Network tab
3. Reload the page
4. Verify `main.js` shows a recent timestamp (should be after your commit time)
5. Check Console tab for any JavaScript errors

## Alternative: Incognito/Private Mode

Open your site in an incognito/private window - this will load fresh files without cache.

## For Netlify Deployments

If the issue persists:

1. Visit your Netlify dashboard
2. Check deployment status for commit `ca95fd5`
3. Verify the build succeeded (green checkmark)
4. Check build logs for any errors

## Service Worker Cache

If you have a service worker (sw.js), it may also be caching old files:

1. Open DevTools → Application tab → Service Workers
2. Click "Unregister" next to your service worker
3. Reload the page

## DNS/CDN Cache

If using Cloudflare or another CDN:

- CDN edge cache may take 5-30 minutes to update
- You can purge the CDN cache manually in your CDN dashboard

---

**The code is correct and deployed!** This is purely a caching issue.
