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
import { loadData, saveData, uid } from "./storage"
import { supabase } from "./supabase"
import {
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

  // users (admin) – the Supabase `profiles` table
  profiles: User[]
  loadProfiles: () => Promise<AuthResult>
  setUserRole: (userId: string, role: Role) => Promise<AuthResult>

  // members
  addMember: (m: Omit<Member, "id">) => Member
  updateMember: (id: string, m: Partial<Member>) => void
  deleteMember: (id: string) => void

  // ministries
  addMinistry: (m: Omit<Ministry, "id">) => Ministry
  updateMinistry: (id: string, m: Partial<Ministry>) => void
  deleteMinistry: (id: string) => void

  // events
  addEvent: (e: Omit<Event, "id" | "registeredMemberIds">) => Event
  updateEvent: (id: string, e: Partial<Event>) => void
  deleteEvent: (id: string) => void
  registerForEvent: (eventId: string, memberId: string) => void
  unregisterFromEvent: (eventId: string, memberId: string) => void

  // attendance
  recordAttendance: (a: Omit<Attendance, "id">) => Attendance
  bulkRecordAttendance: (records: Omit<Attendance, "id">[]) => void

  // donations
  addDonation: (d: Omit<Donation, "id" | "receiptNumber">) => Donation
  deleteDonation: (id: string) => void

  // announcements
  addAnnouncement: (a: Omit<Announcement, "id">) => Announcement
  updateAnnouncement: (id: string, a: Partial<Announcement>) => void
  deleteAnnouncement: (id: string) => void

  // ministry activities
  addActivity: (
    a: Omit<MinistryActivity, "id" | "submittedAt" | "status">,
  ) => MinistryActivity
  reviewActivity: (
    id: string,
    decision: "Approved" | "Rejected",
    reviewerId: string,
    note?: string,
  ) => void
  deleteActivity: (id: string) => void
}

const ChurchContext = createContext<ChurchContextValue | null>(null)

export function ChurchProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<DataState>(() => ({
    users: [],
    members: [],
    ministries: [],
    events: [],
    attendance: [],
    donations: [],
    announcements: [],
    activities: [],
  }))
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [profiles, setProfiles] = useState<User[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [authLoading, setAuthLoading] = useState(true)
  const isLoading = dataLoading || authLoading

  // hydrate church data from localStorage on mount (until the Supabase tables exist, #1)
  useEffect(() => {
    const loaded = loadData()
    // backwards compat: ensure activities array exists for older saved state
    if (!loaded.activities) loaded.activities = []
    setData(loaded)
    setDataLoading(false)
  }, [])

  // persist to localStorage whenever data changes
  useEffect(() => {
    if (!dataLoading) saveData(data)
  }, [data, dataLoading])

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

  // ---------- members ----------
  const addMember = useCallback((m: Omit<Member, "id">) => {
    const newMember: Member = { ...m, id: uid("mem") }
    setData((prev) => ({ ...prev, members: [...prev.members, newMember] }))
    return newMember
  }, [])

  const updateMember = useCallback((id: string, m: Partial<Member>) => {
    setData((prev) => ({
      ...prev,
      members: prev.members.map((x) => (x.id === id ? { ...x, ...m } : x)),
    }))
  }, [])

  const deleteMember = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      members: prev.members.filter((x) => x.id !== id),
      attendance: prev.attendance.filter((a) => a.memberId !== id),
      donations: prev.donations.filter((d) => d.memberId !== id),
      events: prev.events.map((e) => ({
        ...e,
        registeredMemberIds: e.registeredMemberIds.filter((mid) => mid !== id),
      })),
    }))
  }, [])

  // ---------- ministries ----------
  const addMinistry = useCallback((m: Omit<Ministry, "id">) => {
    const newMin: Ministry = { ...m, id: uid("min") }
    setData((prev) => ({ ...prev, ministries: [...prev.ministries, newMin] }))
    return newMin
  }, [])

  const updateMinistry = useCallback((id: string, m: Partial<Ministry>) => {
    setData((prev) => ({
      ...prev,
      ministries: prev.ministries.map((x) => (x.id === id ? { ...x, ...m } : x)),
    }))
  }, [])

  const deleteMinistry = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      ministries: prev.ministries.filter((x) => x.id !== id),
      members: prev.members.map((m) => (m.ministryId === id ? { ...m, ministryId: undefined } : m)),
      activities: prev.activities.filter((a) => a.ministryId !== id),
    }))
  }, [])

  // ---------- events ----------
  const addEvent = useCallback((e: Omit<Event, "id" | "registeredMemberIds">) => {
    const newEvt: Event = { ...e, id: uid("evt"), registeredMemberIds: [] }
    setData((prev) => ({ ...prev, events: [...prev.events, newEvt] }))
    return newEvt
  }, [])

  const updateEvent = useCallback((id: string, e: Partial<Event>) => {
    setData((prev) => ({
      ...prev,
      events: prev.events.map((x) => (x.id === id ? { ...x, ...e } : x)),
    }))
  }, [])

  const deleteEvent = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      events: prev.events.filter((x) => x.id !== id),
      attendance: prev.attendance.filter((a) => a.eventId !== id),
    }))
  }, [])

  const registerForEvent = useCallback((eventId: string, memberId: string) => {
    setData((prev) => ({
      ...prev,
      events: prev.events.map((e) =>
        e.id === eventId && !e.registeredMemberIds.includes(memberId)
          ? { ...e, registeredMemberIds: [...e.registeredMemberIds, memberId] }
          : e,
      ),
    }))
  }, [])

  const unregisterFromEvent = useCallback((eventId: string, memberId: string) => {
    setData((prev) => ({
      ...prev,
      events: prev.events.map((e) =>
        e.id === eventId
          ? { ...e, registeredMemberIds: e.registeredMemberIds.filter((id) => id !== memberId) }
          : e,
      ),
    }))
  }, [])

  // ---------- attendance ----------
  const recordAttendance = useCallback((a: Omit<Attendance, "id">) => {
    const newAtt: Attendance = { ...a, id: uid("att") }
    setData((prev) => {
      const filtered = prev.attendance.filter(
        (x) =>
          !(x.memberId === a.memberId && x.eventId === a.eventId && x.attendanceDate === a.attendanceDate),
      )
      return { ...prev, attendance: [...filtered, newAtt] }
    })
    return newAtt
  }, [])

  const bulkRecordAttendance = useCallback((records: Omit<Attendance, "id">[]) => {
    setData((prev) => {
      let next = prev.attendance
      for (const a of records) {
        next = next.filter(
          (x) =>
            !(x.memberId === a.memberId && x.eventId === a.eventId && x.attendanceDate === a.attendanceDate),
        )
        next = [...next, { ...a, id: uid("att") }]
      }
      return { ...prev, attendance: next }
    })
  }, [])

  // ---------- donations ----------
  const addDonation = useCallback((d: Omit<Donation, "id" | "receiptNumber">) => {
    const newDon: Donation = {
      ...d,
      id: uid("don"),
      receiptNumber: `RCP-${Date.now().toString().slice(-6)}`,
    }
    setData((prev) => ({ ...prev, donations: [...prev.donations, newDon] }))
    return newDon
  }, [])

  const deleteDonation = useCallback((id: string) => {
    setData((prev) => ({ ...prev, donations: prev.donations.filter((x) => x.id !== id) }))
  }, [])

  // ---------- announcements ----------
  const addAnnouncement = useCallback((a: Omit<Announcement, "id">) => {
    const newAnn: Announcement = { ...a, id: uid("ann") }
    setData((prev) => ({ ...prev, announcements: [...prev.announcements, newAnn] }))
    return newAnn
  }, [])

  const updateAnnouncement = useCallback((id: string, a: Partial<Announcement>) => {
    setData((prev) => ({
      ...prev,
      announcements: prev.announcements.map((x) => (x.id === id ? { ...x, ...a } : x)),
    }))
  }, [])

  const deleteAnnouncement = useCallback((id: string) => {
    setData((prev) => ({ ...prev, announcements: prev.announcements.filter((x) => x.id !== id) }))
  }, [])

  // ---------- ministry activities ----------
  const addActivity = useCallback(
    (a: Omit<MinistryActivity, "id" | "submittedAt" | "status">) => {
      const newAct: MinistryActivity = {
        ...a,
        id: uid("act"),
        submittedAt: new Date().toISOString(),
        status: "Pending",
      }
      setData((prev) => ({ ...prev, activities: [...prev.activities, newAct] }))
      return newAct
    },
    [],
  )

  const reviewActivity = useCallback(
    (id: string, decision: "Approved" | "Rejected", reviewerId: string, note?: string) => {
      setData((prev) => ({
        ...prev,
        activities: prev.activities.map((a) =>
          a.id === id
            ? {
                ...a,
                status: decision,
                reviewedById: reviewerId,
                reviewedAt: new Date().toISOString(),
                reviewNote: note,
              }
            : a,
        ),
      }))
    },
    [],
  )

  const deleteActivity = useCallback((id: string) => {
    setData((prev) => ({ ...prev, activities: prev.activities.filter((a) => a.id !== id) }))
  }, [])

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
    profiles,
    loadProfiles,
    setUserRole,
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
