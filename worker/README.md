# WinOptimizer site statistics

This Worker provides a small, privacy-conscious counter for the public GitHub Pages site. It is not connected to the desktop app and does not synchronize themes or device identities.

## What is counted

- **Page views** — each page load on the site where `site-stats.js` is installed.
- **Sessions** — one tab session per UTC day. Opening another tab creates a separate session.
- **Daily totals** — aggregated in D1 and displayed on the site's “Посещаемость сайта” section for today, the last 30 days and a seven-day chart.

The browser creates a random UUID in `sessionStorage`; it is removed when the tab is closed. The Worker stores only a SHA-256 hash of that identifier for the current UTC day. Old session hashes are deleted on the next visit after a day change. IP addresses, user agents, URLs, device IDs, email addresses and account credentials are not stored by this application. Daily aggregate counts are retained.

## Cloudflare configuration

The Worker uses the existing D1 database `winoptimizer-theme-sync`, binding `DB`, and the allowed origins `https://winoptimizer.com`, `https://www.winoptimizer.com` and `https://reikidod.github.io`. No API key or paid Cloudflare feature is required.

After the updated Worker code is deployed, apply the additional migration from the `worker` directory:

```powershell
npx wrangler d1 migrations apply winoptimizer-theme-sync --remote
```

The migration adds `site_daily_stats` and `site_daily_sessions`. It does not drop or modify the earlier tables. Old theme-pairing tables remain untouched and are no longer exposed by the Worker.

## API

- `GET /health` — health check.
- `POST /v1/site/visit` — body: `{ "sessionId": "<uuid>" }`; increments page views and increments sessions only once per tab/day.
- `GET /v1/site/stats?days=30` — public daily aggregates; accepted range is 1–90 days.

The Worker accepts browser requests only from the configured website origins. Statistics are approximate tab sessions, not people or verified unique visitors.

## Local checks

```sh
npm test
```

Tests use Node's built-in test runner and a small in-memory D1 substitute; no third-party packages are required.
