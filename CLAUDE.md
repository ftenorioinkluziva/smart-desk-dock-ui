# Focus Dock — Developer Reference

Minimalist productivity dashboard optimized for a landscape phone screen (667 px) mounted as a desk dock. Built with Next.js 16 + React 19 + Tailwind CSS 4 + shadcn/ui.

---

## Quick Start

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

### Required environment variables (`/.env.local`)

```
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REFRESH_TOKEN=
```

### Optional environment variables

```
WEATHER_LAT=       # default: -15.886953  (Brasília)
WEATHER_LON=       # default: -47.813873
WEATHER_TIMEZONE=  # default: America/Sao_Paulo
WEATHER_LOCATION=  # default: Brasília

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=
GOOGLE_CALENDAR_ID=        # default: primary
GOOGLE_CALENDAR_TIMEZONE=  # default: WEATHER_TIMEZONE or America/Sao_Paulo
```

#### Getting Spotify credentials

1. Create an app at developer.spotify.com → copy Client ID and Secret
2. Add redirect URI: `http://127.0.0.1:3000/callback` (note: `localhost` is blocked since Nov 2025)
3. Authorize (replace `YOUR_CLIENT_ID`):
   ```
   https://accounts.spotify.com/authorize?client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=http%3A%2F%2F127.0.0.1%3A3000%2Fcallback&scope=user-read-playback-state%20user-modify-playback-state
   ```
4. Copy `code` from the redirect URL, then exchange for a refresh token:
   ```bash
   curl.exe -X POST https://accounts.spotify.com/api/token \
     -u "CLIENT_ID:CLIENT_SECRET" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "grant_type=authorization_code&code=CODE&redirect_uri=http%3A%2F%2F127.0.0.1%3A3000%2Fcallback"
   ```
5. Copy `refresh_token` from the response into `.env.local`

---

## Architecture

### App layout — `app/page.tsx`

Single-page app with a **5-panel horizontal carousel** (snap scroll). Each panel occupies the viewport width and available dock height.

### Panels (left → right)

| # | Component | Description |
|---|-----------|-------------|
| 1 | `TodayPanel` | Clock, context phrase, next event, compact weather |
| 2 | `NightDock` | Low-brightness clock mode for night/inactive use |
| 3 | `WeatherForecast` | Current weather and forecast |
| 4 | `ProductivityHub` | Tabbed: Pomodoro · Timer · Stopwatch |
| 5 | `CalendarPage` | Monthly calendar and daily events from Google Calendar when configured |

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
    weather/route.ts          GET  → { temp, high, low, description, condition, forecast, hourly? }
    spotify-now-playing/      GET  → { isPlaying, track, artist, albumArt }
    spotify-control/route.ts  POST { action } → forwards to Spotify Web API

components/
  today-panel.tsx
  night-dock.tsx
  weather-forecast.tsx
  productivity-hub.tsx
  agenda.tsx
  settings-panel.tsx
  spotify-bar.tsx            Bottom playback bar
  theme-provider.tsx
  ui/                        shadcn components (50+)

hooks/
  use-mobile.ts
  use-toast.ts

lib/
  spotify.ts                 getAccessToken(), spotifyControl(), spotifyConfigured flag
  google-calendar.ts         OAuth, calendar list fetch, event fetch + normalization
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

`lib/google-calendar.ts` exports `googleCalendarConfigured` (true when client id, client secret, and refresh token are present). Calendar API routes return `{ mock: true }` when not configured. The settings panel can list connected calendars and stores the selected ids in `localStorage`.

### Spotify mock/real split

`lib/spotify.ts` exports `spotifyConfigured` (true when all three env vars are present). API routes return `{ mock: true }` when not configured; the `SpotifyBar` shows "Configure Spotify credentials" and disables controls.

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

- **Weather location is static.** Could be made configurable via settings panel.
- **Settings UI is partial.** Calendar selection and night mode are configurable; alert preferences, weather city, and theme/brightness still need UI.
- **Spotify requires Premium** for playback control (play/pause/skip).
- **No PWA offline support.** Service worker not implemented; weather/Spotify fail without network.
- **iOS Home Screen behavior still needs device validation.** Manifest/icons and safe-area code are in place, but fullscreen behavior should be checked on a real iPhone/iPad.
- **Apple platform alert limitations.** iOS/iPadOS support for web vibration is limited or absent, notification permission must be requested from explicit user action, and reliable background/audio alerts should always have a visual fallback.
