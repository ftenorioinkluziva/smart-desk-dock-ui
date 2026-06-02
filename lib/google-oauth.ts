import { auth } from "@/lib/auth"

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

