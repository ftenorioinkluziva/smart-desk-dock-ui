import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { nextCookies } from "better-auth/next-js"
import * as schema from "@/db/schema"
import { drizzleDb } from "@/lib/drizzle"

function parseTrustedOrigins() {
  const origins = [
    process.env.BETTER_AUTH_URL,
    process.env.BETTER_AUTH_TRUSTED_ORIGINS,
  ]
    .flatMap((value) => value?.split(",") ?? [])
    .map((value) => value.trim())
    .filter(Boolean)

  return Array.from(new Set(origins))
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  trustedOrigins: parseTrustedOrigins(),
  secret: process.env.BETTER_AUTH_SECRET ?? "focus-dock-development-secret-change-me",
  database: drizzleAdapter(drizzleDb, {
    provider: "pg",
    schema,
  }),
  account: {
    encryptOAuthTokens: true,
    updateAccountOnSignIn: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      accessType: "offline",
      prompt: "select_account consent",
      scope: [
        "email",
        "profile",
        "https://www.googleapis.com/auth/calendar.readonly",
      ],
    },
  },
  plugins: [nextCookies()],
})
