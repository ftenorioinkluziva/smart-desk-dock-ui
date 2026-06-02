# Focus Dock — Developer Reference

Minimalist productivity dashboard optimized for a landscape phone screen (667 px) mounted as a desk dock. Built with Next.js 16 + React 19 + Tailwind CSS 4 + shadcn/ui.

---

## Quick Start

```bash
pnpm install
pnpm db:migrate   # after DATABASE_URL is configured
pnpm dev          # http://localhost:3000
```

Drizzle manages both Better Auth tables (`user`, `session`, `account`, `verification`) and app tables (`user_profiles`, `user_integration_secrets`). Use `pnpm db:generate` for schema changes and `pnpm db:migrate` to apply migrations.

### Required environment variables (`/.env.local`)

```
BETTER_AUTH_URL=          # e.g. http://localhost:3000
BETTER_AUTH_SECRET=
DATABASE_URL=
APP_ENCRYPTION_KEY=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REDIRECT_ORIGIN=  # default local fallback: http://127.0.0.1:3000
```

### Optional environment variables

```
WEATHER_LAT=       # default: -15.886953  (Brasília)
WEATHER_LON=       # default: -47.813873
WEATHER_TIMEZONE=  # default: America/Sao_Paulo
WEATHER_LOCATION=  # default: Brasília

FINANCE_API_URL=      # e.g. http://127.0.0.1:3001 or https://paridade-risco-mobile-api.vercel.app

OPENAI_REALTIME_MODEL=             # default: gpt-realtime-mini
OPENAI_REALTIME_VOICE=             # default: marin
OPENAI_REALTIME_REASONING_EFFORT=  # default: low, used with gpt-realtime-2
```

#### Getting Spotify credentials

1. Create an app at developer.spotify.com → copy Client ID and Secret
2. Add redirect URI: `http://127.0.0.1:3000/api/spotify/auth/callback`
3. Keep only `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` in `.env.local`
4. Each signed-in Focus Dock user connects their own Spotify account from Settings

---

## Architecture

### App layout — `app/page.tsx`

Single-page app with a **9-panel horizontal carousel** (snap scroll). Each panel occupies the viewport width and available dock height.

### Panels (left → right)

| # | Component | Description |
|---|-----------|-------------|
| 1 | `TodayPanel` | Clock, context phrase, next event, compact weather |
| 2 | `VoiceAgentPanel` | OpenAI Realtime voice conversation panel |
| 3 | `NightDock` | Low-brightness clock mode for night/inactive use |
| 4 | `WeatherForecast` | Current weather and forecast |
| 5 | `ProductivityHub` | Tabbed: Pomodoro · Timer · Stopwatch |
| 6 | `CalendarPage` | Monthly calendar and daily events from Google Calendar when configured |
| 7 | `HomeAssistantPanel` | Home Assistant favorites: lights, switches, covers, scenes, scripts |
| 8 | `FinancePanel` | Compact investment portfolio from paridade-risco-mobile |
| 9 | `SpotifyExpandedPanel` | Expanded Spotify playback, devices, volume, and playlists |

### Persistent bottom bar

`SpotifyBar` — always visible at the bottom. Polls `/api/spotify-now-playing` every 7 s. Shows album art, track name, artist, and playback controls.

---

## File Map

```
app/
  page.tsx                   Main page — carousel + lifted state
  layout.tsx                 Root layout (Vercel Analytics, theme)
  globals.css                Tailwind 4 theme tokens (OKLCH)
  api/
    calendar-events/route.ts  GET  → { events }
    calendar-list/route.ts    GET  → { calendars }
    finance/summary/route.ts  GET  → compact portfolio summary
    home-assistant/entities/   GET  → { entities }
    home-assistant/service/    POST { entityId, action, brightness? }
    realtime/session/route.ts  POST → OpenAI Realtime ephemeral client secret
    weather/route.ts          GET  → { temp, high, low, description, condition, forecast, hourly? }
    spotify-now-playing/      GET  → { isPlaying, track, artist, albumArt }
    spotify-control/route.ts  POST { action } → forwards to Spotify Web API

components/
  today-panel.tsx
  night-dock.tsx
  weather-forecast.tsx
  finance-panel.tsx
  home-assistant-panel.tsx
  productivity-hub.tsx
  agenda.tsx
  settings-panel.tsx
  voice-agent-panel.tsx       OpenAI Realtime voice conversation panel
  spotify-bar.tsx            Bottom playback bar
  theme-provider.tsx
  ui/                        shadcn components (50+)

hooks/
  use-mobile.ts
  use-realtime-agent.ts       WebRTC lifecycle for OpenAI Realtime
  use-toast.ts

lib/
  auth.ts                    Better Auth + Google + Drizzle adapter
  db.ts                      shared pg Pool
  drizzle.ts                 Drizzle client using the shared pool
  integration-secrets.ts     encrypted per-user integration secrets
  user-profile.ts            per-user profile defaults and persistence
  spotify.ts                 getAccessToken(), spotifyControl(), spotifyConfigured flag
  google-calendar.ts         OAuth, calendar list fetch, event fetch + normalization
  finance.ts                 server-side paridade-risco-mobile API proxy helpers
  home-assistant.ts          server-side Home Assistant API wrapper
  realtime-agent.ts          OpenAI Realtime session defaults and agent instructions
  calendar-settings.ts       selected Google Calendar ids in localStorage
  dock-settings.ts           night mode settings in localStorage
  utils.ts                   cn() (clsx + tailwind-merge)

public/
  sounds/pomodoro/           3 pomodoro completion chimes
```

---

## Key Patterns

### Adding a new carousel panel

1. Create component in `components/`
2. Append a `<div className="w-screen shrink-0 ...">` inside the scroll container in `app/page.tsx`
3. Add a pagination dot

### Adding a new API route

Create `app/api/<name>/route.ts` and export named functions (`GET`, `POST`, etc.). Keep Spotify helpers in `lib/spotify.ts` and Google Calendar helpers in `lib/google-calendar.ts`, not inline.

### Google Calendar mock/real split

Google sign-in is handled by Better Auth. Calendar API routes require a signed-in user and use that user's Google OAuth account. The settings panel can list connected calendars and persists selected ids in the user profile, with `localStorage` only as a temporary migration fallback.

### Home Assistant mock/real split

Home Assistant URL/token are per-user encrypted secrets. Home Assistant API routes return `{ configured: false, mock: true }` when not configured. The browser never receives the HA token; service calls go through `app/api/home-assistant/service/route.ts`.

### Finance mock/real split

`lib/finance.ts` exports `financeConfigured` (true when `FINANCE_API_URL` is present). The browser never stores the Finance token. Finance login uses `/api/finance/auth/login`, stores the upstream token encrypted per Focus Dock user, and `/api/finance/summary` forwards to `paridade-risco-mobile` with the server-side token.

**Auth flow:** The finance panel shows a login form when no Finance token exists for the signed-in Focus Dock user. The user authenticates via `POST /api/finance/auth/login` (proxied to upstream). On upstream 401, the encrypted token is cleared and the login form reappears.

### Spotify mock/real split

Spotify uses global app credentials (`SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`) plus per-user OAuth. API routes return `{ spotifyAuthRequired: true, mock: true }` when the signed-in user has not connected Spotify; the `SpotifyBar` shows a connect-account state and disables controls.

### OpenAI Realtime mock/real split

OpenAI Realtime uses a per-user encrypted OpenAI API key. The browser requests an ephemeral client secret from `app/api/realtime/session/route.ts`; the OpenAI API key is never sent to the browser. When the user has not configured a key, the voice panel shows a setup state.

### Optimistic UI (SpotifyBar)

Local state flips immediately on button click → command sent → `setTimeout(fetchNowPlaying, 1500)` confirms with server.

---

## Styling

- Tailwind CSS 4 with `@theme` inline in `globals.css`
- OKLCH color tokens for light and dark mode
- Target viewport: **667 × 375 px landscape** (iPhone SE / 8)
- `viewport` in `layout.tsx` locks `maximum-scale=1` (no zoom)
- Utility: `cn(...classes)` from `lib/utils.ts`

---

## Known Limitations / Future Work

- **Weather location is profile-based.** Defaults to Brasília until the signed-in user saves profile settings.
- **Settings UI is partial.** Profile, OpenAI, Spotify, Finance and Home Assistant are configurable; theme/brightness still need UI.
- **Spotify requires Premium** for playback control (play/pause/skip).
- **No PWA offline support.** Service worker not implemented; weather/Spotify fail without network.
- **iOS Home Screen behavior still needs device validation.** Manifest/icons and safe-area code are in place, but fullscreen behavior should be checked on a real iPhone/iPad.
- **Apple platform alert limitations.** iOS/iPadOS support for web vibration is limited or absent, notification permission must be requested from explicit user action, and reliable background/audio alerts should always have a visual fallback.
