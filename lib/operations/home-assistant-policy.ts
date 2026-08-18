import { failure, success, validationError, type Result } from "@/lib/operations/errors"

const BLOCKED_HOSTS = new Set([
  "0.0.0.0",
  "169.254.169.254",
  "metadata.google.internal",
])

export function parseAllowedHomeAssistantHosts(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean),
  )
}

export function validateHomeAssistantUrl(value: string, allowedHosts: Set<string>): Result<string> {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return failure(validationError("Home Assistant URL is invalid", ["url"]))
  }

  if (!(["http:", "https:"] as string[]).includes(url.protocol) || url.username || url.password) {
    return failure(validationError("Home Assistant URL must use HTTP or HTTPS without embedded credentials", ["url"]))
  }

  const hostname = url.hostname.toLowerCase()
  if (BLOCKED_HOSTS.has(hostname)) {
    return failure(validationError("Home Assistant host is blocked by the server policy", ["url"]))
  }

  if (allowedHosts.size > 0 && !allowedHosts.has(hostname)) {
    return failure(validationError("Home Assistant host is not in HOME_ASSISTANT_ALLOWED_HOSTS", ["url"]))
  }

  url.pathname = url.pathname.replace(/\/$/, "")
  url.search = ""
  url.hash = ""
  return success(url.toString().replace(/\/$/, ""))
}
