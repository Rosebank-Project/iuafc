import type { AuthError, User as SupabaseUser } from "@supabase/supabase-js"
import { supabase } from "./supabase"
import type { Profile, Role, User } from "./types"

export interface AuthResult {
  success: boolean
  error?: string
}

const PROFILE_COLUMNS = "id, full_name, email, role, member_id, ministry_id"

export function profileToUser(p: Profile): User {
  return {
    id: p.id,
    username: p.email,
    fullName: p.full_name,
    role: p.role,
    memberId: p.member_id ?? undefined,
    ministryId: p.ministry_id ?? undefined,
  }
}

/**
 * Builds the signed-in user from their row in `profiles`. If the profile cannot be read
 * (e.g. offline), the user is treated as a Church Member.
 */
export async function loadCurrentUser(user: SupabaseUser): Promise<User> {
  const { data } = await supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", user.id).maybeSingle()
  if (data) return profileToUser(data as Profile)

  const meta = user.user_metadata ?? {}
  return {
    id: user.id,
    username: user.email ?? "",
    fullName: meta.full_name || meta.name || user.email || "Member",
    role: "Church Member",
  }
}

export async function loadProfiles(): Promise<{ users: User[]; error?: string }> {
  const { data, error } = await supabase.from("profiles").select(PROFILE_COLUMNS).order("full_name")
  if (error) return { users: [], error: "Could not load users. Please try again." }
  return { users: (data as Profile[]).map(profileToUser) }
}

/** Changes a role through the `set_user_role` database function (Administrators only). */
export async function setUserRole(userId: string, role: Role): Promise<AuthResult> {
  const { error } = await supabase.rpc("set_user_role", { target_user: userId, new_role: role })
  // The database function raises messages written for the user.
  return error ? { success: false, error: error.message } : { success: true }
}

/** Turns Supabase Auth errors into messages the user understands. */
export function friendlyAuthError(error: AuthError | null): string {
  if (!error) return "Something went wrong. Please try again."
  if (error.name === "AuthRetryableFetchError" || error.status === 0) {
    return "No internet connection. Check your connection and try again."
  }
  switch (error.code) {
    case "invalid_credentials":
      return "Incorrect email or password."
    case "user_already_exists":
    case "email_exists":
      return "An account with this email already exists."
    case "email_not_confirmed":
      return "Please confirm your email before signing in."
    case "weak_password":
      return "This password is too weak. Choose a stronger one."
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Too many attempts. Please wait a few minutes and try again."
    default:
      return error.message || "Something went wrong. Please try again."
  }
}
