# WinOptimizer theme sync API

This Worker stores only device identity, a validated theme ID/accent ID, and hashes of bearer credentials. It does not collect Windows inventory, telemetry, email addresses, or account profiles.

## Pairing protocol

1. The WPF app creates a random stable device UUID and a fresh 256-bit polling secret.
2. `POST /v1/pairings` returns an eight-character, single-use code with a 10-minute lifetime.
3. The user enters that code on the official website. `POST /v1/pairings/claim` atomically consumes it, stores the initial theme, and issues separate device and browser credentials.
4. The website receives a short-lived (12-hour) browser bearer token. The app polls with its polling secret and receives its device bearer token once.
5. Both clients exchange only allowlisted theme IDs and accent IDs through `GET/PUT /v1/theme`.
6. The device can revoke its credential and associated browser sessions through `POST /v1/device/revoke`.

The device UUID is an identifier, not an authentication secret. Pairing codes are stored as SHA-256 hashes. Device tokens are stored as SHA-256 hashes; the one-time delivery copy is encrypted with AES-GCM and a Cloudflare secret, then erased when polled. Browser sessions are stored as hashes and expire after 12 hours.

The website's default appearance remains unchanged until a browser session is explicitly linked. The website keeps its 12-hour browser bearer token in tab-scoped `sessionStorage`; the token is not placed in a URL, analytics, or logs. The selected display theme may be remembered separately in `localStorage`. The WPF app stores its device token as a generic credential in Windows Credential Manager for the current Windows user; it is never written to `settings.json`.

## Configure Cloudflare

Requirements: a Cloudflare account, Wrangler CLI, and Node.js 20+.

```sh
cd worker
npx wrangler login
npx wrangler d1 create winoptimizer-theme-sync
```

Copy the generated database ID into `wrangler.toml`, then:

```sh
npx wrangler d1 migrations apply winoptimizer-theme-sync --remote
npx wrangler secret put TOKEN_ENCRYPTION_KEY
```

Provide a cryptographically random secret of at least 32 characters (for example, generate 32 random bytes locally and encode them as hex). Do not commit it. Deploy only after setting the exact website origin in `ALLOWED_ORIGINS`:

```sh
npx wrangler deploy
```

The website and WPF app currently use `https://winoptimizer-theme-sync-api.aceberi86.workers.dev`. Before treating a deployment as fully accepted, complete a real end-to-end pairing test: generate a code in the app, claim it on the website, then change the theme on each side and verify the other side receives the change. Health checks and unit tests alone do not prove pairing works.

## API

- `GET /health` — service health.
- `POST /v1/pairings` — body: `{ "deviceId": "<uuid>", "pollSecret": "<64 hex chars>" }`.
- `POST /v1/pairings/claim` — body: `{ "code": "<8 chars>", "theme": { "id": "dark", "accent": "blue" } }`.
- `POST /v1/pairings/poll` — body: `{ "pairingId": "<uuid>", "pollSecret": "<64 hex chars>" }`; returns 202 while waiting.
- `GET /v1/theme` — bearer-authenticated theme read.
- `PUT /v1/theme` — bearer-authenticated body: `{ "id": "midnight", "accent": "purple" }`.
- `POST /v1/device/revoke` — device-token-only revocation.

The allowlists are aligned with the WPF `ThemeManager`: theme IDs are `dark`, `light`, `redblack`, `midnight`, `emerald`, `violet`, `amoled`; accent IDs are `theme`, `blue`, `red`, `green`, `purple`, `orange`, `pink`. Keep these values synchronized with the application when adding or removing a theme.

## Local checks

```sh
npm test
```

The test suite uses Node's built-in test runner and requires no third-party runtime dependencies.
