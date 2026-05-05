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

Single-page app with a **4-panel horizontal carousel** (snap scroll). Each panel occupies 100 vw × 100 dvh. Edge tap zones (8 px) advance/retreat the carousel.

State that lives in `page.tsx` (lifted because it spans panels):
- Pomodoro cycle (via `usePomodoro`)
- Alarms CRUD + firing logic (via `useAlarms`)
- Free timer and stopwatch

### Panels (left → right)

| # | Component | Description |
|---|-----------|-------------|
| 1 | `ClockWeather` | Live clock, weather (temp / high-low / condition) |
| 2 | `ProductivityHub` | Tabbed: Pomodoro · Timer · Stopwatch |
| 3 | `Agenda` | Daily event list (currently mock data) |
| 4 | `AlarmsView` | Alarm CRUD — lists, enables/disables, fires overlay |

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
    weather/route.ts          GET  → { temp, high, low, description, condition }
    spotify-now-playing/      GET  → { isPlaying, track, artist, albumArt }
    spotify-control/          POST { action } → forwards to Spotify Web API

components/
  clock-weather.tsx
  productivity-hub.tsx
  agenda.tsx
  alarms-view.tsx
  alarm-modal.tsx            Add/edit alarm dialog
  alarm-overlay.tsx          Full-screen firing overlay (snooze / stop)
  spotify-bar.tsx            Bottom playback bar
  theme-provider.tsx
  ui/                        shadcn components (50+)

hooks/
  use-pomodoro.ts            State machine: idle → running → finished, 4-cycle sequence
  use-alarms.ts              CRUD + localStorage persistence

lib/
  spotify.ts                 getAccessToken(), spotifyControl(), spotifyConfigured flag
  alarms.ts                  Alarm type, DayOfWeek, ALARM_SOUNDS constants
  utils.ts                   cn() (clsx + tailwind-merge)

public/
  sounds/alarm/              5 alarm sound files
  sounds/pomodoro/           3 pomodoro completion chimes
```

---

## Key Patterns

### Adding a new carousel panel

1. Create component in `components/`
2. Append a `<div className="w-screen shrink-0 ...">` inside the scroll container in `app/page.tsx`
3. Add a pagination dot

### Adding a new API route

Create `app/api/<name>/route.ts` and export named functions (`GET`, `POST`, etc.). Keep Spotify helpers in `lib/spotify.ts`, not inline.

### Alarm system

`useAlarms` persists to `localStorage` key `"focus-dock-alarms"`. The 1-second tick in `page.tsx` compares `HH:MM` against enabled alarms; a `firedThisMinute` ref prevents double-firing. Snooze adds 10 minutes to `nextSnooze` on the alarm object.

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

- **Agenda is hardcoded mock data.** Next step: integrate Google Calendar API or CalDAV.
- **Weather location is static.** Could be made configurable via settings panel.
- **No settings UI.** Pomodoro durations, weather city, theme are not user-configurable at runtime.
- **Spotify requires Premium** for playback control (play/pause/skip).
- **No PWA offline support.** Service worker not implemented; weather/Spotify fail without network.
- **`spotify-player.tsx` and `pomodoro-timer.tsx`** in `components/` are leftover scaffolding — not used in the main page.
