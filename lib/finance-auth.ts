export const FINANCE_AUTH_STORAGE_KEY = "focus-dock-finance-auth"

export type FinanceAuthUser = {
  id: string
  email: string
  name?: string
  role: string
}

export type FinanceAuth = {
  token: string
  user: FinanceAuthUser
}

export function readFinanceAuth(): FinanceAuth | null {
  if (typeof window === "undefined") return null

  try {
    const raw = window.localStorage.getItem(FINANCE_AUTH_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as FinanceAuth
    if (!parsed.token || !parsed.user?.email) {
      window.localStorage.removeItem(FINANCE_AUTH_STORAGE_KEY)
      return null
    }
    return parsed
  } catch {
    window.localStorage.removeItem(FINANCE_AUTH_STORAGE_KEY)
    return null
  }
}

export function saveFinanceAuth(auth: FinanceAuth) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(FINANCE_AUTH_STORAGE_KEY, JSON.stringify(auth))
}

export function clearFinanceAuth() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(FINANCE_AUTH_STORAGE_KEY)
}
