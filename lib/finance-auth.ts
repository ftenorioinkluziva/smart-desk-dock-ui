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

export const FINANCE_AUTH_CHANGED_EVENT = "focus-dock-finance-auth-changed"

let currentFinanceAuth: FinanceAuth | null = null

export function readFinanceAuth(): FinanceAuth | null {
  return currentFinanceAuth
}

export function saveFinanceAuth(auth: FinanceAuth) {
  currentFinanceAuth = auth
}

export function clearFinanceAuth() {
  currentFinanceAuth = null
}
