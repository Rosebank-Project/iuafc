import type { DataState } from "./types"
import { getSeedData } from "./seed-data"

const DATA_KEY = "iuafc_church_data_v1"
const SESSION_KEY = "iuafc_church_session_v1"
const ATTEMPTS_KEY = "iuafc_church_login_attempts_v1"

export interface LoginAttempt {
  count: number
  lockUntil?: number
}

export function loadLoginAttempts(): Record<string, LoginAttempt> {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(ATTEMPTS_KEY)
    return raw ? (JSON.parse(raw) as Record<string, LoginAttempt>) : {}
  } catch {
    return {}
  }
}

export function saveLoginAttempts(attempts: Record<string, LoginAttempt>) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts))
}

export function loadData(): DataState {
  if (typeof window === "undefined") return getSeedData()
  try {
    const raw = window.localStorage.getItem(DATA_KEY)
    if (!raw) {
      const seed = getSeedData()
      window.localStorage.setItem(DATA_KEY, JSON.stringify(seed))
      return seed
    }
    return JSON.parse(raw) as DataState
  } catch {
    const seed = getSeedData()
    window.localStorage.setItem(DATA_KEY, JSON.stringify(seed))
    return seed
  }
}

export function saveData(data: DataState) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(DATA_KEY, JSON.stringify(data))
}

export function loadSession(): string | null {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(SESSION_KEY)
}

export function saveSession(userId: string) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(SESSION_KEY, userId)
}

export function clearSession() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(SESSION_KEY)
}

export function resetData() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(DATA_KEY)
  window.localStorage.removeItem(SESSION_KEY)
}

export const hashPassword = (s: string) =>
  typeof window !== "undefined" ? btoa(s) : Buffer.from(s).toString("base64")

export const verifyPassword = (raw: string, hashed: string) => hashPassword(raw) === hashed

export function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}
