# Focus Dock architecture

Focus Dock is a modular Next.js monolith with one application core and two confirmed interfaces:

- the React dashboard for a signed-in human;
- the embedded OpenAI Realtime voice agent, which calls the same authenticated HTTP operations.

There is no current consumer for a CLI, local MCP, remote MCP, queue, or orchestrator. Add one only when a concrete consumer requires it.

## Dependency direction

```text
React UI / Realtime adapter
            |
       Next.js routes
            |
 schemas + operation errors + use cases
            |
 Spotify / Google / OpenAI / Open-Meteo / Finance / Home Assistant gateways
            |
 encrypted per-user secrets + PostgreSQL
```

Routes authenticate, parse untrusted input with canonical Zod schemas, obtain private context, invoke one operation, and translate its result to HTTP. Credentials are never accepted as tool arguments and never returned to the browser, except for short-lived OpenAI Realtime client secrets created for the authenticated user.

## Error contract

Expected failures use `OperationError`:

```ts
type OperationError = {
  code: string
  category: "validation" | "authorization" | "conflict" | "rate_limit" | "upstream" | "internal"
  message: string
  hint?: string
  retryable: boolean
  invalidFields?: string[]
}
```

HTTP errors preserve the legacy textual `error` field and add `operationError`. Realtime tool failures return `{ ok: false, error, operationError }`.

## Operation and effect matrix

| Operation | Effect | Confirmation | Idempotency/retry | Interfaces |
| --- | --- | --- | --- | --- |
| Read weather, calendar, Spotify, home, finance | read | none | transient retry permitted by caller | UI, Realtime |
| Update profile/integration configuration | reversible write | explicit settings action | database upsert | UI |
| Spotify play/pause/next/previous | external write, low risk | explicit user request | no automatic retry; Realtime deduplicates by call id | UI, Realtime |
| Spotify device/volume/playlist control | external write, low risk | explicit UI action | no automatic retry | UI |
| Productivity start/pause/reset | local reversible write | explicit user request | Realtime deduplicates by call id | UI, Realtime |
| Home Assistant service | external write | explicit UI action | no automatic retry; favorite entity authorization | UI |
| Finance login | external authentication write | explicit form submission | no automatic retry | UI |
| Disconnect/clear integration | reversible destructive configuration change | explicit settings action | delete is inherently idempotent | UI |

No current operation is long-running enough to justify a durable job.

## Security boundaries

- Better Auth establishes the user identity at the HTTP boundary.
- Integration credentials are encrypted at rest and scoped by `userId`.
- `BETTER_AUTH_SECRET` and `APP_ENCRYPTION_KEY` are mandatory runtime configuration.
- Home Assistant URLs allow only HTTP(S), reject embedded credentials and metadata endpoints, disable redirects, and optionally enforce `HOME_ASSISTANT_ALLOWED_HOSTS`. Set the allowlist whenever accounts are not all equally trusted.
- External responses are validated before application normalization.
- Logs record stable error codes and retry metadata, not provider bodies or credentials.

## Validation gates

Run `pnpm check` for lint, typecheck, and deterministic tests. A production build must also pass before publishing the Docker image. The container healthcheck calls `/api/health`, which verifies both Next.js and PostgreSQL.
