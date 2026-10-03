import type { DataState } from "./types"
import { getSeedData } from "./seed-data"

// Church data is kept in localStorage until the Supabase tables exist (#1 in the mobile repo).
// Login and sessions are handled by Supabase Auth (lib/auth.ts).
const DATA_KEY = "iuafc_church_data_v1"

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

export function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}
