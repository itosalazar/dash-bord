# dash-bord

A private, installable desk display for an iPhone XR (or any phone) resting **sideways on a charging stand** — and
for an **iPad** in either orientation. It is a
foreground "Desk Mode" web app, not a StandBy replacement: big live clock, weather, the next calendar events, one
featured Pinterest image and one gentle habit cue, laid out as a landscape bento grid.

Visual language follows the references in `../ref`: matte squircle tiles in black, bone and signal vermilion on a slate
desk; neo-grotesk numerals (Geist), monospace micro-labels (Geist Mono), dot-matrix accents, and a serif (Instrument
Serif) for the cue. Three themes: `graphite` (default), `noir`, `paper`.

```
┌──────────────────────────────┬──────────┬─────────────────┐
│ 18:46 ⠿⠿                     │ outside  │ up next         │
│ sun 01 nov                   │ 12°  ☀   │ ▌Design review  │
│ design review in 44 min  ○ ⚙ │ l 7 ━● h │ ▌Deep work      │
├──────────────────────────────┴───┬──────┴─────────────────┤
│ [inspiration] [Warm modernism] ⟳ │ a gentle cue     01/52 │
│        one featured Pin          │ Keep the next step     │
│ 01 / 03                          │ small enough to start. │
└──────────────────────────────────┴────────────────────────┘
```

Everything works **without any accounts** (mock mode is the default). Real integrations switch on with environment
variables.

---

## Contents

- [Features](#features)
- [Project structure](#project-structure)
- [Local development](#local-development)
- [Checks](#checks)
- [Install on the iPhone](#install-on-the-iphone)
- [Next steps: GitHub → Vercel](#next-steps-github--vercel)
- [Deploy to Vercel](#deploy-to-vercel)
- [Database setup](#database-setup)
- [Google Calendar setup](#google-calendar-setup)
- [Pinterest setup](#pinterest-setup)
- [Weather providers](#weather-providers)
- [Cues](#cues)
- [Environment variables](#environment-variables)
- [Architecture notes](#architecture-notes)
- [Known limitations](#known-limitations)

---

## Features

**Desk**
- Oversized live clock (12/24 h, optional dot-matrix seconds, any IANA time zone), date and a contextual line
  ("design review in 18 min", "a clear day to make things").
- Weather tile (dot-matrix condition icon, temperature, low/high bar) and calendar tile (next two events, countdown).
- Inspiration tile: exactly **one** featured Pin image, board name, discreet refresh control; tapping opens the
  original Pin in a new browser context. Rotation: manual, hourly, daily, or on launch.
- "A gentle cue" tile: one motivational / habit prompt; tap for the next one.
- Settings stay out of the way: a small settings button and a **long-press on the clock**.
- Responsive: iPhone landscape (down to 568×320), iPad landscape, and an iPad portrait layout (clock across the top,
  tiles stacked). Phones held upright get a "turn me sideways" state.
- Settings → **About** explains the idea, how to use it, credits and copyright.
- Optional night dimming (22:00–06:00).

**Desk Mode**
- Explicit control that calls `navigator.wakeLock.request("screen")` only from a tap.
- Re-requests the lock when the app becomes visible again; shows *paused / tap to resume / screen may sleep* fallbacks
  and Auto-Lock guidance if the API is missing or the lock is revoked.
- Never forces orientation, fullscreen or background execution.

**Data**
- Calendar refresh ≈ 5 min, weather ≈ 30 min, Pinterest pins ≈ 6 h (server-cached), plus "refresh everything" and
  per-provider retry with last-updated text in Settings.
- Last good snapshot of every provider is cached on the device, so the desk keeps working offline or on flaky Wi-Fi
  (stale tiles are labelled with their age and a retry button).
- Service worker: offline shell, cache-first build assets, stale-while-revalidate images (including the Pinterest
  CDN). API responses are never cached by the SW.

**Privacy & security**
- The whole app sits behind a single-user passphrase (signed, HttpOnly session cookie). Production fails closed if
  auth isn't configured.
- OAuth runs server-side. Client secrets, refresh tokens and API keys never reach the browser. Tokens are
  AES-256-GCM encrypted before they are written to Postgres.
- Remote cue feeds are fetched server-side with HTTPS-only, private-network blocking, no redirects, a timeout and a
  size cap, then schema-validated.
- No network calls at build time (fonts are bundled locally, telemetry disabled in scripts).

---

## Project structure

```
dash-bord-app/
├─ src/
│  ├─ app/                     Next.js App Router
│  │  ├─ page.tsx              desk (client-rendered dashboard)
│  │  ├─ login/ setup/ offline/
│  │  ├─ manifest.ts           web app manifest
│  │  └─ api/                  route handlers (all server-side)
│  │     ├─ weather/ calendar/ inspiration/ cues/remote/ geocode/
│  │     ├─ settings/ status/ health/
│  │     ├─ auth/login  auth/logout
│  │     └─ connect/[provider]/ (start) /callback /disconnect
│  ├─ proxy.ts                 auth gate (Next 16 "proxy", formerly middleware)
│  ├─ components/
│  │  ├─ dashboard/            Clock, Weather, Calendar, Inspiration, Cue tiles
│  │  ├─ settings/             Settings sheet, sections, cue editor
│  │  └─ ui/                   DotMatrix (digits + weather icons), Icon
│  ├─ hooks/                   useClock, useWakeLock, useResource, useSettings, …
│  └─ lib/
│     ├─ providers/            typed provider interfaces + implementations
│     │  ├─ types.ts           WeatherProvider, CalendarProvider, InspirationProvider, QuoteProvider
│     │  ├─ registry.ts        env-driven selection (mock by default)
│     │  ├─ calendar/          mock, google, shared filters
│     │  ├─ weather/           mock, open-meteo, openweathermap
│     │  ├─ inspiration/       mock (local demo art), pinterest
│     │  └─ quotes/            built-in cues, remote feed
│     ├─ server/               env, session, crypto, db, store, oauth (server-only)
│     ├─ settings.ts           zod schema + defaults (shared)
│     ├─ cues.ts  time.ts  context-line.ts  types.ts
├─ public/
│  ├─ sw.js                    service worker
│  ├─ icons/                   app icons (generated by `npm run icons`)
│  └─ demo/                    original warm-modernist demo illustrations (SVG)
├─ db/schema.sql               idempotent Postgres schema
└─ scripts/                    migrate, generate-icons, generate-secret
```

---

## Local development

Requirements: **Node.js ≥ 20.9** (tested with Node 24 LTS) and npm.

```bash
cd dash-bord-app
npm install
cp .env.example .env.local     # optional — everything defaults to mock mode
npm run dev                     # http://localhost:3000
```

In development without `DASHBORD_PASSPHRASE`, sign-in is skipped. To try the real login locally, set
`DASHBORD_PASSPHRASE` and `AUTH_SECRET` (`npm run secret` prints fresh values).

The service worker only registers in production builds. To test offline behaviour:

```bash
npm run build
npm start                       # http://localhost:3000
```

> **External drive note (FAT32 / exFAT).** These filesystems have no symlinks, so a plain `npm install` fails to
> create `node_modules/.bin`. Use `npm install --no-bin-links` — every npm script calls tools via
> `node ./node_modules/...` and works without `.bin`. macOS also writes `._*` AppleDouble files on these drives; they
> are git-ignored and excluded from TypeScript/ESLint, and Turbopack's disk cache is disabled in `next.config.ts` for
> the same reason. `dot_clean -m .` removes them if you want a tidy folder.

To test on the phone over Wi-Fi before deploying, run `npm run dev -- -H 0.0.0.0` and open
`http://<your-mac-ip>:3000` in Safari. (Wake Lock and service workers need HTTPS on real devices, so the full PWA
experience needs the deployed URL.)

---

## Checks

```bash
npm run lint        # ESLint (next/core-web-vitals + typescript)
npm run typecheck   # tsc --noEmit
npm run build       # production build
npm run check       # all three
```

---

## Install on the iPhone

1. Deploy (below) and open the URL in **Safari** on the iPhone.
2. Share → **Add to Home Screen** → Add. (The `/setup` page shows the same steps.)
3. Open **dash-bord from the Home Screen** and sign in there — the installed app has its own cookie jar, separate from
   Safari.
4. Put the phone sideways on its charging stand and tap **desk mode**.
5. If the screen still sleeps (Low Power Mode, older iOS without Wake Lock in home-screen apps): Settings → Display &
   Brightness → Auto-Lock → **Never** while docked. Guided Access (Settings → Accessibility) keeps the phone on
   dash-bord if you like.

---

## Next steps: GitHub → Vercel

The repository should be **this folder** (`dash-bord-app/`), not the parent (which holds the reference images).
`.gitignore` already keeps `node_modules`, `.next`, `.env.local` and macOS `._*` files out.

**1. Create the GitHub repository** — github.com → **New repository** → name `dash-bord`, **Private**, *no* README /
.gitignore / license (the project has its own). Copy the HTTPS URL.

**2. Commit and push** from Terminal:

```bash
cd /Volumes/MEDIA/CLAUDE_stuff/dash-bord/dash-bord-app
git init
git symbolic-ref HEAD refs/heads/main   # name the branch "main" (works on older git too)
git config core.fileMode false        # FAT32 drives don't store file permissions
git add .
git status                            # check: no .env.local, node_modules or ._* files listed
git commit -m "Initial commit: dash-bord desk dashboard"
git remote add origin https://github.com/<your-username>/dash-bord.git
git push -u origin main
```

GitHub asks for a username and a **personal access token** (not your password) on the first push — create one at
GitHub → Settings → Developer settings → Personal access tokens, or install GitHub Desktop and use *Add existing
repository* instead of the commands above.

**3. Import into Vercel** — vercel.com → **Add New… → Project** → *Import* the `dash-bord` repository. Framework:
Next.js (auto-detected). Leave build settings as they are. Before the first deploy, open **Environment Variables**
and add at least:

| name                  | value                                           |
| --------------------- | ----------------------------------------------- |
| `DASHBORD_PASSPHRASE` | your sign-in passphrase                         |
| `AUTH_SECRET`         | from `npm run secret`                           |
| `TOKEN_ENCRYPTION_KEY`| from `npm run secret`                           |
| `WEATHER_PROVIDER`    | `open-meteo` for real weather (no key needed)   |

Click **Deploy**. Then set `APP_URL` to the URL Vercel gives you (e.g. `https://dash-bord.vercel.app`) and
redeploy.

**4. Add the database (optional, needed for Google/Pinterest)** — Vercel project → **Storage → Create → Neon** →
connect it to the project (adds `DATABASE_URL`). Copy the connection string and run once on your Mac:

```bash
DATABASE_URL="postgres://…" npm run db:migrate
```

**5. Connect services** — follow [Google Calendar setup](#google-calendar-setup) and
[Pinterest setup](#pinterest-setup), add their env vars in Vercel, switch `CALENDAR_PROVIDER=google` /
`INSPIRATION_PROVIDER=pinterest`, redeploy, then use **Settings → Calendar / Inspiration → connect**.

**6. Install on the devices** — see [Install on the iPhone](#install-on-the-iphone); the same steps work on iPad
(the Share button is at the top right).

From then on, every `git push` to `main` deploys automatically; pushes to other branches get preview URLs.

---

## Deploy to Vercel

1. Push `dash-bord-app/` to a Git repository (it can be the repository root or a subfolder — set **Root Directory**
   to `dash-bord-app` in Vercel if it's a subfolder).
2. Vercel → **Add New Project** → import the repo. Framework preset: Next.js. Build command and output are the
   defaults (`npm run build`).
3. **Storage → Marketplace → Neon (Postgres)** → create and connect to the project. This injects `DATABASE_URL`.
4. Add environment variables (Production + Preview):
   - `DASHBORD_PASSPHRASE`, `AUTH_SECRET`, `TOKEN_ENCRYPTION_KEY` (from `npm run secret`)
   - `APP_URL` = your production URL, e.g. `https://dash-bord.vercel.app`
   - Provider switches and credentials as needed (see [Environment variables](#environment-variables)).
5. Apply the schema once (from your machine, with the Neon connection string):
   ```bash
   DATABASE_URL="postgres://…" npm run db:migrate
   ```
6. Redeploy. Visit `/login`.

Without `DATABASE_URL` the app still runs: settings live on the device only and OAuth connections are disabled.

---

## Database setup

`db/schema.sql` is idempotent (`create table if not exists`). Tables:

| table               | purpose                                                                      |
| ------------------- | ---------------------------------------------------------------------------- |
| `app_users`         | one row, `owner` — everything is keyed by user id so multi-user can come later |
| `user_settings`     | settings JSON (validated by zod on read and write)                          |
| `oauth_connections` | Google / Pinterest grants; refresh + access tokens **encrypted** by the app  |
| `provider_cache`    | server-side cache (resolved Pinterest board id, pin lists)                    |

Any Postgres works (Neon, Supabase, local). Use the pooled connection string on serverless hosts; the client uses
`prepare: false` for transaction poolers. `TOKEN_ENCRYPTION_KEY` must stay stable — rotating it means reconnecting
Google and Pinterest.

---

## Google Calendar setup

1. [Google Cloud Console](https://console.cloud.google.com/) → create a project → **APIs & Services → Library** →
   enable **Google Calendar API**.
2. **OAuth consent screen**: User type *External*, add your Google account as a test user, add the scope
   `https://www.googleapis.com/auth/calendar.events.readonly` (read-only events — the narrowest scope that can list
   them).
3. **Credentials → Create credentials → OAuth client ID → Web application**.
   - Authorized redirect URI: `https://<your-domain>/api/connect/google/callback`
     (and `http://localhost:3000/api/connect/google/callback` for local testing).
4. Set `CALENDAR_PROVIDER=google`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, plus `DATABASE_URL` and
   `TOKEN_ENCRYPTION_KEY`. Redeploy.
5. dash-bord → Settings → Calendar → **connect**. Easiest from a desktop browser signed in to dash-bord; the
   connection is stored server-side, so the phone picks it up.

> While the consent screen is in **Testing** status, Google expires refresh tokens after 7 days. For a long-lived
> personal setup, set the publishing status to **In production** (Google shows an "unverified app" warning for your
> own account, which you can accept) or reconnect weekly.

Behaviour: events from the primary calendar within the next 24 h (12/48 h selectable), in-progress events included.
Settings can hide declined, all-day, and private/confidential events. Disconnect revokes the grant at Google and
deletes the stored tokens.

---

## Pinterest setup

dash-bord uses only the **official Pinterest API v5 with OAuth** — it never scrapes Pinterest pages and never embeds a
multi-Pin board widget. It reads Pin metadata and image URLs, caches them server-side for 6 h, and the device shows
one Pin at a time.

1. [developers.pinterest.com](https://developers.pinterest.com/) → connect a Pinterest **business** account (free
   conversion) → **My apps → Connect app**.
2. In the app settings add the redirect URI `https://<your-domain>/api/connect/pinterest/callback`.
3. Scopes requested: `boards:read`, `pins:read` (add `boards:read_secret`, `pins:read_secret` by setting
   `PINTEREST_INCLUDE_SECRET_BOARDS=true`).
4. Set `INSPIRATION_PROVIDER=pinterest`, `PINTEREST_APP_ID`, `PINTEREST_APP_SECRET`, plus `DATABASE_URL` and
   `TOKEN_ENCRYPTION_KEY`. Redeploy.
5. dash-bord → Settings → Inspiration → **connect**, then paste a board URL like
   `https://www.pinterest.com/<username>/<board-name>/`.

Requirements and caveats:
- New Pinterest apps start on a limited access tier and must be reviewed before Standard access. Check the tier and
  rate limits in the developer portal; reading boards owned by the authorizing account is the use case dash-bord
  needs.
- The board must be owned by (or shared with) the connected account — the API cannot read arbitrary public boards.
  The board is matched by owner username + board-name slug from the URL.
- Video Pins are skipped; only image Pins are featured.
- Until connected, the tile shows a "Pinterest connection pending" empty state. In mock mode three original local
  illustrations stand in.

---

## Weather providers

| `WEATHER_PROVIDER` | key needed | notes                                                               |
| ------------------ | ---------- | ------------------------------------------------------------------- |
| `mock` (default)   | –          | clear, 12 °C, day/night from your time zone                         |
| `open-meteo`       | no         | free for non-commercial use; daily high/low and precipitation chance |
| `openweathermap`   | yes        | `OPENWEATHERMAP_API_KEY`; current-conditions API                    |

The env var sets the default; Settings → Weather lets you pick any provider the server has available. Location comes
from a city search (Open-Meteo geocoding, server-side) or the device's location.

---

## Cues

- **Built-in**: 52 short, original, attribution-free cues (`src/lib/providers/quotes/builtin.ts`).
- **My cues**: add, edit, reorder, delete; optionally schedule each one for certain weekdays and/or a time of day
  (morning / afternoon / evening / night).
- **Remote JSON feed**: any HTTPS endpoint returning
  ```json
  [{ "text": "Start with the smallest step.", "attribution": "optional", "tags": ["optional"] }]
  ```
  Fetched and validated server-side (≤ 256 KB, ≤ 500 items, 6 s timeout, no redirects, private networks blocked),
  then cached on the device. If it fails, the built-in set is used.
- **Mix** combines all three. Rotation: manual, every 15 min, hourly, daily, or on launch. Attribution display is a
  toggle.

---

## Environment variables

All variables are server-only. See `.env.example` for comments.

| name                              | required                  | purpose                                          |
| --------------------------------- | ------------------------- | ------------------------------------------------ |
| `DASHBORD_PASSPHRASE`             | production                | the sign-in passphrase                           |
| `AUTH_SECRET`                     | production                | session signing key, ≥ 32 chars                  |
| `DATABASE_URL` / `POSTGRES_URL`   | for OAuth + settings sync | Postgres connection string                       |
| `TOKEN_ENCRYPTION_KEY`            | for OAuth                 | 32 bytes base64, encrypts tokens at rest         |
| `APP_URL`                         | recommended               | public origin for OAuth redirect URIs            |
| `CALENDAR_PROVIDER`               | –                         | `mock` \| `google`                               |
| `GOOGLE_CLIENT_ID` / `_SECRET`    | for Google                | OAuth web client                                 |
| `WEATHER_PROVIDER`                | –                         | `mock` \| `open-meteo` \| `openweathermap`       |
| `OPENWEATHERMAP_API_KEY`          | for OpenWeatherMap        |                                                  |
| `INSPIRATION_PROVIDER`            | –                         | `mock` \| `pinterest`                            |
| `PINTEREST_APP_ID` / `_SECRET`    | for Pinterest             |                                                  |
| `PINTEREST_INCLUDE_SECRET_BOARDS` | –                         | `true` to request secret-board scopes            |

---

## Architecture notes

- **Providers.** `src/lib/providers/types.ts` defines the contracts. Each returns a `ProviderResult<T>` —
  `{ ok: true, data, source, fetchedAt }` or `{ ok: false, error: { code, message }, source }`. Route handlers pick an
  implementation through `registry.ts`. To add one (say, CalDAV), implement `CalendarProvider`, register it, add the
  env value. The UI needs no change.
- **Client data flow.** `useResource` fetches an endpoint on an interval, on visibility return and on reconnect,
  writes successful payloads to a localStorage snapshot, and keeps showing the last good data on transient errors.
  Errors that mean "this no longer applies" (`not_connected`, `unauthorized`, …) clear it.
- **Rotation without timers.** The featured Pin and cue index are `scramble(bucket) + offset`, where the bucket comes
  from the cadence (hour, day, launch seed, or fixed for manual). Reloads inside a period are stable; the refresh
  button bumps the offset.
- **Settings** are zod-validated, stored on the device first and mirrored to Postgres (`updatedAt` wins).
- **Auth.** `src/proxy.ts` gates every page and API route except `/login`, `/setup`, `/offline`, PWA assets and
  `/api/health`. Route handlers re-check the session.

---

## Credits & copyright

© 2026 Ito Salazar — [itosalazar.com](https://itosalazar.com). All rights reserved.

Typefaces: Geist and Geist Mono (Vercel) and Instrument Serif — SIL Open Font License. Built-in cues and demo
illustrations are original to this project.

---

## Known limitations

- iOS gives home-screen apps a separate cookie jar, so sign in inside the installed app. OAuth connections are best
  started from a desktop browser (they're stored server-side).
- Screen Wake Lock in home-screen apps needs a recent iOS (16.4+, with fixes in 18.4). Older versions show the Auto-Lock
  fallback.
- All-day Google events are anchored to local midnight of the server when filtering; the 24-hour window can be off
  by your UTC offset at the edges.
- Login rate limiting is per server instance (fine for one user; not a substitute for a WAF).
- The remote cue feed guard resolves DNS before fetching but cannot fully rule out DNS rebinding; only add feeds you
  trust.
