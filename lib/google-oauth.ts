import { auth } from "@/lib/auth"

export { GOOGLE_TASKS_SCOPE } from "@/lib/google-scopes"

export async function getGoogleAccessToken(request: Request, userId: string) {
  try {
    const token = await auth.api.getAccessToken({
      headers: request.headers,
      body: {
        providerId: "google",
        userId,
      },
    })
    return token.accessToken
  } catch {
    return null
  }
}
