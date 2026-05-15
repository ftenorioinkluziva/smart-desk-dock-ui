# User Profiles and Google Calendar Authorization Plan

## Goal

Move Focus Dock from a single server-level configuration model to a per-user profile model.

Today, several integrations are configured only through `.env.local`. The new feature should add access control with Better Auth, allow users to sign in with Google, and let each signed-in user authorize Google Calendar synchronization and configure personal integration settings.

## Target Behavior

- The app has Google-only sign-in at first.
- Each user has an exclusive profile.
- Google Calendar data is fetched from the logged-in user's authorized Google account.
- User-specific settings that are currently in `.env.local` move into persisted profile settings.
- Sensitive user credentials, such as Home Assistant and Finance tokens, are stored encrypted.
- Server routes resolve the current user from the session before loading private calendar, weather, finance, or home automation data.

## Better Auth Setup

Use Better Auth as the authentication layer.

Required global environment variables:

```env
BETTER_AUTH_URL=
BETTER_AUTH_SECRET=
DATABASE_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
APP_ENCRYPTION_KEY=
```

`GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` remain app-level OAuth credentials. The user's Google Calendar access comes from the user's OAuth authorization, not from a shared server refresh token.

Google provider configuration should request offline access:

```ts
socialProviders: {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    accessType: "offline",
    prompt: "select_account consent",
  },
}
```

This matters because Google usually returns a `refresh_token` only when offline access and consent are requested. If a user previously authorized the app without offline access, they may need to revoke the app in their Google account and authorize again.

Recommended Better Auth setting:

```ts
account: {
  encryptOAuthTokens: true,
}
```

## Google Calendar Authorization

Calendar access should be a user action, not a global `.env` token.

Suggested flow:

1. User signs in with Google.
2. User opens profile/settings.
3. User clicks "Connect calendar".
4. App requests Google Calendar scope:

```ts
await authClient.linkSocial({
  provider: "google",
  scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
})
```

5. Server uses the logged-in user's Google OAuth account to get or refresh the provider access token.
6. Server calls Google Calendar API with that user token.
7. User selects which calendars should appear in the dock.

The current server-level `GOOGLE_REFRESH_TOKEN` should be removed from the Calendar flow after this migration.

## Data Model

Use Better Auth's own tables for users, sessions, and OAuth accounts.

Add an app profile table:

```text
user_profiles
- userId
- weatherLat
- weatherLon
- weatherTimezone
- weatherLocation
- googleCalendarIds
- googleCalendarTimezone
- nightModeEnabled
- nightModeStart
- nightModeEnd
- createdAt
- updatedAt
```

Add a secrets table for user-owned integration credentials:

```text
user_integration_secrets
- userId
- provider
- key
- encryptedValue
- createdAt
- updatedAt
```

Suggested `provider` values:

```text
home_assistant
finance
spotify
openai
```

For encrypted values, use server-side encryption with `APP_ENCRYPTION_KEY`. Do not send stored secrets back to the browser.

## Environment Variable Migration

### Keep Global

These remain server-level configuration:

```env
BETTER_AUTH_URL=
BETTER_AUTH_SECRET=
DATABASE_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
APP_ENCRYPTION_KEY=
```

Likely global, depending on product decision:

```env
OPENAI_API_KEY=
OPENAI_REALTIME_MODEL=
OPENAI_REALTIME_VOICE=
OPENAI_REALTIME_REASONING_EFFORT=
```

Keep `OPENAI_API_KEY` global if the app owner pays for voice-agent usage. Move it to user profile only if each user should bring their own OpenAI key.

### Move to User Profile

Non-secret user settings:

```env
WEATHER_LAT=
WEATHER_LON=
WEATHER_TIMEZONE=
WEATHER_LOCATION=
GOOGLE_CALENDAR_ID=
GOOGLE_CALENDAR_TIMEZONE=
HOME_ASSISTANT_ENTITIES=
```

Sensitive user settings:

```env
HOME_ASSISTANT_URL=
HOME_ASSISTANT_TOKEN=
FINANCE_API_URL=
FINANCE_API_TOKEN=
FINANCE_API_USER_ID=
```

`HOME_ASSISTANT_URL` and `FINANCE_API_URL` are not always secrets, but they can reveal private infrastructure. Store them with the same care as tokens.

### Future OAuth Migration

Spotify currently uses:

```env
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REFRESH_TOKEN=
```

Long term, Spotify should also become per-user OAuth. For the first version, keep Spotify global unless the feature explicitly includes Spotify account separation.

## Server Refactor

Create helpers:

```text
lib/auth.ts
lib/auth-client.ts
lib/current-user.ts
lib/user-profile.ts
lib/crypto.ts
```

Expected responsibilities:

- `lib/auth.ts`: Better Auth server configuration.
- `lib/auth-client.ts`: browser client for sign-in, sign-out, and linking Google.
- `lib/current-user.ts`: session lookup for API routes.
- `lib/user-profile.ts`: profile read/write and default merging.
- `lib/crypto.ts`: encrypt/decrypt user integration secrets.

Existing routes to update:

```text
app/api/calendar-events/route.ts
app/api/calendar-list/route.ts
app/api/weather/route.ts
app/api/home-assistant/entities/route.ts
app/api/home-assistant/service/route.ts
app/api/finance/summary/route.ts
app/api/realtime/session/route.ts
```

Existing libs to update:

```text
lib/google-calendar.ts
lib/home-assistant.ts
lib/finance.ts
lib/realtime-agent.ts
lib/calendar-settings.ts
lib/dock-settings.ts
```

`lib/calendar-settings.ts` and `lib/dock-settings.ts` currently use `localStorage`. After profiles exist, settings should be stored server-side and loaded through profile APIs. Local storage can remain temporarily as a migration fallback.

## API Behavior

Unauthenticated private requests should not look like server failures.

Recommended response shapes:

```json
{ "events": [], "authRequired": true }
```

```json
{ "events": [], "calendarAuthRequired": true }
```

```json
{ "entities": [], "configured": false }
```

Use HTTP status codes intentionally:

- `401`: user is not signed in.
- `403`: user is signed in but lacks the required linked provider or permission.
- `200` with empty data: integration is optional and simply not configured.
- `502`: upstream provider failed after correct user configuration was present.

## UI Plan

Expand `SettingsPanel` into a profile/settings surface.

Initial sections:

- Account: Google sign-in, signed-in user, sign-out.
- Calendar: connect Google Calendar, select calendars, timezone.
- Weather: location label, latitude, longitude, timezone.
- Home Assistant: URL, token, favorite entities.
- Finance: API URL, token or user id.
- Dock: night mode and other existing local settings.

For secret fields:

- Show whether a value is configured.
- Allow replacing the value.
- Do not render the stored value back to the browser.
- Provide a "clear" action.

## Implementation Phases

### Phase 1: Auth Foundation

- Install Better Auth and database dependencies.
- Add Better Auth server config.
- Add auth route.
- Add browser auth client.
- Add sign-in and sign-out UI in settings.
- Verify a Google-only login works locally.

### Phase 2: Profile Persistence

- Add profile and integration-secret tables.
- Add profile read/update API.
- Move night mode settings from `localStorage` to profile storage.
- Keep `localStorage` fallback during migration.

### Phase 3: Google Calendar Per User

- Remove `GOOGLE_REFRESH_TOKEN` from calendar access.
- Request Calendar readonly scope through Google OAuth.
- Update `lib/google-calendar.ts` to use the logged-in user's provider token.
- Update `/api/calendar-list`.
- Update `/api/calendar-events`.
- Persist selected calendar ids in `user_profiles`.
- Show calendar connection state in settings.

### Phase 4: Weather Per User

- Move weather location settings to `user_profiles`.
- Update `/api/weather` to resolve location from the current user profile.
- Keep current Brasilia defaults for anonymous or unconfigured users.

### Phase 5: Home Assistant and Finance Per User

- Add encrypted storage for user-owned integration secrets.
- Update Home Assistant routes to use the current user's URL, token, and entity list.
- Update Finance route to use the current user's API URL and auth setting.
- Make the settings UI handle configured, missing, and failed states clearly.

### Phase 6: Cleanup and Hardening

- Remove obsolete `.env.local` entries from docs once migrated.
- Add tests for session-required API routes.
- Add tests for encrypted secret read/write.
- Add error handling for revoked Google authorization.
- Add a "Reconnect Google Calendar" path.
- Review whether OpenAI and Spotify should remain app-level or become user-level.

## Acceptance Criteria

- A user can sign in with Google.
- A signed-in user can authorize Google Calendar access.
- Calendar list and events come from the signed-in user's Google account.
- Calendar selection persists per user.
- Weather settings persist per user.
- Home Assistant and Finance credentials can be saved, replaced, and cleared per user.
- Secrets are never exposed back to the browser.
- Existing dock panels keep working with sensible unauthenticated or unconfigured states.
- `.env.local` no longer needs a shared `GOOGLE_REFRESH_TOKEN` for Google Calendar sync.

## References

- Better Auth Google provider: https://better-auth.com/docs/authentication/google
- Better Auth OAuth concepts: https://better-auth.com/docs/concepts/oauth
- Better Auth options: https://better-auth.com/docs/reference/options
