"use client"

import type React from "react"
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import type {
  Announcement,
  Attendance,
  DataState,
  Donation,
  Event,
  Member,
  Ministry,
  MinistryActivity,
  Role,
  User,
} from "./types"
import { supabase } from "./supabase"
import {
  deleteRegistration,
  deleteRow,
  insertActivity,
  insertAnnouncement,
  insertDonation,
  insertEvent,
  insertMember,
  insertMinistry,
  insertRegistration,
  loadChurchData,
  reviewActivityRow,
  updateAnnouncementRow,
  updateEventRow,
  updateMemberRow,
  updateMinistryRow,
  upsertAttendance,
  type Result,
} from "./data"
import {
  deleteMyAccount,
  friendlyAuthError,
  loadCurrentUser,
  loadProfiles as fetchProfiles,
  setUserRole as updateUserRole,
  type AuthResult,
} from "./auth"

interface ChurchContextValue {
  // state
  data: DataState
  currentUser: User | null
  isLoading: boolean

  // auth (Supabase Auth – passwords are hashed by Supabase)
  signIn: (email: string, password: string) => Promise<AuthResult>
  signUp: (fullName: string, email: string, password: string) => Promise<AuthResult & { needsConfirmation?: boolean }>
  signInWithGoogle: () => Promise<AuthResult>
  sendPasswordReset: (email: string) => Promise<AuthResult>
  updatePassword: (password: string) => Promise<AuthResult>
  logout: () => Promise<void>
  /** Permanently deletes the signed-in account and signs out (Google Play requirement). */
  deleteAccount: () => Promise<AuthResult>

  // users (admin) – the Supabase `profiles` table
  profiles: User[]
  loadProfiles: () => Promise<AuthResult>
  setUserRole: (userId: string, role: Role) => Promise<AuthResult>

  // church data (Supabase tables). Every change returns a Result so the page can show errors.
  dataError: string | null
  reloadData: () => Promise<void>

  // members
  addMember: (m: Omit<Member, "id">) => Promise<Result<Member>>
  updateMember: (id: string, m: Partial<Member>) => Promise<Result<Member>>
  deleteMember: (id: string) => Promise<Result>

  // ministries
  addMinistry: (m: Omit<Ministry, "id">) => Promise<Result<Ministry>>
  updateMinistry: (id: string, m: Partial<Ministry>) => Promise<Result<Ministry>>
  deleteMinistry: (id: string) => Promise<Result>

  // events
  addEvent: (e: Omit<Event, "id" | "registeredMemberIds">) => Promise<Result<Event>>
  updateEvent: (id: string, e: Partial<Event>) => Promise<Result>
  deleteEvent: (id: string) => Promise<Result>
  registerForEvent: (eventId: string, memberId: string) => Promise<Result>
  unregisterFromEvent: (eventId: string, memberId: string) => Promise<Result>

  // attendance
  recordAttendance: (a: Omit<Attendance, "id">) => Promise<Result>
  bulkRecordAttendance: (records: Omit<Attendance, "id">[]) => Promise<Result>

  // donations (the database assigns the receipt number)
  addDonation: (d: Omit<Donation, "id" | "receiptNumber">) => Promise<Result<Donation>>
  deleteDonation: (id: string) => Promise<Result>

  // announcements
  addAnnouncement: (a: Omit<Announcement, "id">) => Promise<Result<Announcement>>
  updateAnnouncement: (id: string, a: Partial<Announcement>) => Promise<Result<Announcement>>
  deleteAnnouncement: (id: string) => Promise<Result>

  // ministry activities
  addActivity: (
    a: Omit<MinistryActivity, "id" | "submittedAt" | "status">,
  ) => Promise<Result<MinistryActivity>>
  reviewActivity: (
    id: string,
    decision: "Approved" | "Rejected",
    reviewerId: string,
    note?: string,
  ) => Promise<Result>
  deleteActivity: (id: string) => Promise<Result>
}

const ChurchContext = createContext<ChurchContextValue | null>(null)

const EMPTY_DATA: DataState = {
  users: [],
  members: [],
  ministries: [],
  events: [],
  attendance: [],
  donations: [],
  announcements: [],
  activities: [],
}

export function ChurchProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<DataState>(EMPTY_DATA)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [profiles, setProfiles] = useState<User[]>([])
  const [dataLoading, setDataLoading] = useState(false)
  const [dataError, setDataError] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const isLoading = authLoading || dataLoading

  // follow the Supabase session (sign in, sign out, Google redirect, token refresh)
  useEffect(() => {
    let active = true
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      // Supabase recommends not awaiting other Supabase calls inside this callback.
      setTimeout(async () => {
        const user = session?.user ? await loadCurrentUser(session.user) : null
        if (!active) return
        setCurrentUser(user)
        setAuthLoading(false)
      }, 0)
    })
    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  // ---------- church data ----------
  const reloadData = useCallback(async () => {
    const result = await loadChurchData()
    if (result.success) {
      setData(result.data)
      setDataError(null)
    } else {
      setDataError(result.error)
    }
  }, [])

  // Load the church data once the user is signed in; clear it when they sign out.
  const userId = currentUser?.id
  useEffect(() => {
    if (!userId) {
      setData(EMPTY_DATA)
      return
    }
    let active = true
    setDataLoading(true)
    loadChurchData().then((result) => {
      if (!active) return
      if (result.success) {
        setData(result.data)
        setDataError(null)
      } else {
        setDataError(result.error)
      }
      setDataLoading(false)
    })
    return () => {
      active = false
    }
  }, [userId])

  // ---------- auth ----------
  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    return error ? { success: false, error: friendlyAuthError(error) } : { success: true }
  }, [])

  const signUp = useCallback(async (fullName: string, email: string, password: string) => {
    const { data: result, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim() },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    })
    if (error) return { success: false, error: friendlyAuthError(error) }
    // With "Confirm email" enabled there is no session until the link is clicked.
    return { success: true, needsConfirmation: !result.session }
  }, [])

  const signInWithGoogle = useCallback(async (): Promise<AuthResult> => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    })
    return error ? { success: false, error: friendlyAuthError(error) } : { success: true }
  }, [])

  const sendPasswordReset = useCallback(async (email: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return error ? { success: false, error: friendlyAuthError(error) } : { success: true }
  }, [])

  const updatePassword = useCallback(async (password: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.updateUser({ password })
    return error ? { success: false, error: friendlyAuthError(error) } : { success: true }
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const deleteAccount = useCallback(() => deleteMyAccount(), [])

  // ---------- users (admin) ----------
  const loadProfiles = useCallback(async (): Promise<AuthResult> => {
    const { users, error } = await fetchProfiles()
    if (error) return { success: false, error }
    setProfiles(users)
    return { success: true }
  }, [])

  const setUserRole = useCallback(
    async (userId: string, role: Role): Promise<AuthResult> => {
      const result = await updateUserRole(userId, role)
      if (result.success) await loadProfiles()
      return result
    },
    [loadProfiles],
  )

  // Each change is saved in Supabase first; the screen is only updated when it succeeds.
  // Deletes reload everything, because the database also clears linked rows
  // (registrations, attendance) or the links to the deleted record.
  const removeAndReload = useCallback(
    async (table: Parameters<typeof deleteRow>[0], id: string): Promise<Result> => {
      const result = await deleteRow(table, id)
      if (result.success) await reloadData()
      return result
    },
    [reloadData],
  )

  // ---------- members ----------
  const addMember = useCallback(async (m: Omit<Member, "id">) => {
    const result = await insertMember(m)
    if (result.success) setData((prev) => ({ ...prev, members: [...prev.members, result.data] }))
    return result
  }, [])

  const updateMember = useCallback(async (id: string, m: Partial<Member>) => {
    const result = await updateMemberRow(id, m)
    if (result.success) {
      setData((prev) => ({ ...prev, members: prev.members.map((x) => (x.id === id ? result.data : x)) }))
    }
    return result
  }, [])

  const deleteMember = useCallback((id: string) => removeAndReload("members", id), [removeAndReload])

  // ---------- ministries ----------
  const addMinistry = useCallback(async (m: Omit<Ministry, "id">) => {
    const result = await insertMinistry(m)
    if (result.success) setData((prev) => ({ ...prev, ministries: [...prev.ministries, result.data] }))
    return result
  }, [])

  const updateMinistry = useCallback(async (id: string, m: Partial<Ministry>) => {
    const result = await updateMinistryRow(id, m)
    if (result.success) {
      setData((prev) => ({ ...prev, ministries: prev.ministries.map((x) => (x.id === id ? result.data : x)) }))
    }
    return result
  }, [])

  const deleteMinistry = useCallback((id: string) => removeAndReload("ministries", id), [removeAndReload])

  // ---------- events ----------
  const addEvent = useCallback(async (e: Omit<Event, "id" | "registeredMemberIds">) => {
    const result = await insertEvent(e)
    if (result.success) setData((prev) => ({ ...prev, events: [...prev.events, result.data] }))
    return result
  }, [])

  const updateEvent = useCallback(async (id: string, e: Partial<Event>) => {
    const result = await updateEventRow(id, e)
    if (result.success) {
      setData((prev) => ({ ...prev, events: prev.events.map((x) => (x.id === id ? { ...x, ...e } : x)) }))
    }
    return result
  }, [])

  const deleteEvent = useCallback((id: string) => removeAndReload("events", id), [removeAndReload])

  const registerForEvent = useCallback(async (eventId: string, memberId: string) => {
    const result = await insertRegistration(eventId, memberId)
    if (result.success) {
      setData((prev) => ({
        ...prev,
        events: prev.events.map((e) =>
          e.id === eventId && !e.registeredMemberIds.includes(memberId)
            ? { ...e, registeredMemberIds: [...e.registeredMemberIds, memberId] }
            : e,
        ),
      }))
    }
    return result
  }, [])

  const unregisterFromEvent = useCallback(async (eventId: string, memberId: string) => {
    const result = await deleteRegistration(eventId, memberId)
    if (result.success) {
      setData((prev) => ({
        ...prev,
        events: prev.events.map((e) =>
          e.id === eventId ? { ...e, registeredMemberIds: e.registeredMemberIds.filter((id) => id !== memberId) } : e,
        ),
      }))
    }
    return result
  }, [])

  // ---------- attendance ----------
  const bulkRecordAttendance = useCallback(
    async (records: Omit<Attendance, "id">[]): Promise<Result> => {
      if (!currentUser) return { success: false, error: "Please sign in again." }
      const result = await upsertAttendance(records, currentUser.id)
      if (!result.success) return result
      setData((prev) => {
        // One record per member per event: replace the old ones
        const saved = new Set(result.data.map((a) => `${a.eventId}|${a.memberId}`))
        const kept = prev.attendance.filter((a) => !saved.has(`${a.eventId}|${a.memberId}`))
        return { ...prev, attendance: [...kept, ...result.data] }
      })
      return { success: true, data: undefined }
    },
    [currentUser],
  )

  const recordAttendance = useCallback(
    (a: Omit<Attendance, "id">) => bulkRecordAttendance([a]),
    [bulkRecordAttendance],
  )

  // ---------- donations ----------
  const addDonation = useCallback(async (d: Omit<Donation, "id" | "receiptNumber">) => {
    const result = await insertDonation(d)
    if (result.success) setData((prev) => ({ ...prev, donations: [result.data, ...prev.donations] }))
    return result
  }, [])

  const deleteDonation = useCallback((id: string) => removeAndReload("donations", id), [removeAndReload])

  // ---------- announcements ----------
  const addAnnouncement = useCallback(async (a: Omit<Announcement, "id">) => {
    const result = await insertAnnouncement(a)
    if (result.success) setData((prev) => ({ ...prev, announcements: [result.data, ...prev.announcements] }))
    return result
  }, [])

  const updateAnnouncement = useCallback(async (id: string, a: Partial<Announcement>) => {
    const result = await updateAnnouncementRow(id, a)
    if (result.success) {
      setData((prev) => ({
        ...prev,
        announcements: prev.announcements.map((x) => (x.id === id ? result.data : x)),
      }))
    }
    return result
  }, [])

  const deleteAnnouncement = useCallback((id: string) => removeAndReload("announcements", id), [removeAndReload])

  // ---------- ministry activities ----------
  const addActivity = useCallback(async (a: Omit<MinistryActivity, "id" | "submittedAt" | "status">) => {
    const result = await insertActivity(a)
    if (result.success) setData((prev) => ({ ...prev, activities: [...prev.activities, result.data] }))
    return result
  }, [])

  const reviewActivity = useCallback(
    async (id: string, decision: "Approved" | "Rejected", reviewerId: string, note?: string): Promise<Result> => {
      const result = await reviewActivityRow(id, decision, reviewerId, note)
      if (!result.success) return result
      setData((prev) => ({ ...prev, activities: prev.activities.map((x) => (x.id === id ? result.data : x)) }))
      return { success: true, data: undefined }
    },
    [],
  )

  const deleteActivity = useCallback((id: string) => removeAndReload("ministry_activities", id), [removeAndReload])

  const value: ChurchContextValue = {
    data,
    currentUser,
    isLoading,
    signIn,
    signUp,
    signInWithGoogle,
    sendPasswordReset,
    updatePassword,
    logout,
    deleteAccount,
    profiles,
    loadProfiles,
    setUserRole,
    dataError,
    reloadData,
    addMember,
    updateMember,
    deleteMember,
    addMinistry,
    updateMinistry,
    deleteMinistry,
    addEvent,
    updateEvent,
    deleteEvent,
    registerForEvent,
    unregisterFromEvent,
    recordAttendance,
    bulkRecordAttendance,
    addDonation,
    deleteDonation,
    addAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    addActivity,
    reviewActivity,
    deleteActivity,
  }

  return <ChurchContext.Provider value={value}>{children}</ChurchContext.Provider>
}

export function useChurch() {
  const ctx = useContext(ChurchContext)
  if (!ctx) throw new Error("useChurch must be used within ChurchProvider")
  return ctx
}
