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
  User,
} from "./types"
import {
  clearSession,
  hashPassword,
  loadData,
  loadLoginAttempts,
  loadSession,
  saveData,
  saveLoginAttempts,
  saveSession,
  uid,
  verifyPassword,
  type LoginAttempt,
} from "./storage"

const MAX_LOGIN_ATTEMPTS = 5
const LOGIN_LOCK_MS = 15 * 60 * 1000 // 15 minutes

interface ChurchContextValue {
  // state
  data: DataState
  currentUser: User | null
  isLoading: boolean

  // auth
  login: (username: string, password: string, role: string) => { success: boolean; error?: string }
  logout: () => void

  // users (admin)
  addUser: (u: Omit<User, "id" | "password"> & { password: string }) => { success: boolean; user?: User; error?: string }
  updateUser: (id: string, u: Partial<Omit<User, "password">> & { password?: string }) => { success: boolean; error?: string }
  deleteUser: (id: string) => { success: boolean; error?: string }

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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // hydrate from localStorage on mount
  useEffect(() => {
    const loaded = loadData()
    // backwards compat: ensure activities array exists for older saved state
    if (!loaded.activities) loaded.activities = []
    setData(loaded)
    const session = loadSession()
    if (session) setCurrentUserId(session)
    setIsLoading(false)
  }, [])

  // persist to localStorage whenever data changes
  useEffect(() => {
    if (!isLoading) saveData(data)
  }, [data, isLoading])

  const currentUser = useMemo(
    () => data.users.find((u) => u.id === currentUserId) ?? null,
    [data.users, currentUserId],
  )

  const login = useCallback(
    (username: string, password: string, role: string) => {
      const uname = username.trim().toLowerCase()
      const attempts = loadLoginAttempts()
      const record = attempts[uname]

      // 1. account lockout from repeated failures
      if (record?.lockUntil && record.lockUntil > Date.now()) {
        const mins = Math.ceil((record.lockUntil - Date.now()) / 60000)
        return {
          success: false,
          error: `Account locked due to multiple failed attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}.`,
        }
      }

      const registerFailure = () => {
        const prev = attempts[uname]?.count ?? 0
        const count = prev + 1
        const next: LoginAttempt = { count }
        if (count >= MAX_LOGIN_ATTEMPTS) {
          next.lockUntil = Date.now() + LOGIN_LOCK_MS
          next.count = 0
        }
        attempts[uname] = next
        saveLoginAttempts(attempts)
        return count
      }

      // 2. username must exist in the system
      const byName = data.users.find((u) => u.username.toLowerCase() === uname)
      if (!byName) {
        registerFailure()
        return { success: false, error: "No account found with that username." }
      }

      // 3. role must match the selected role
      if (byName.role !== role) {
        registerFailure()
        return { success: false, error: "This account is not registered for the selected role." }
      }

      // 4. password must match stored credentials
      if (!verifyPassword(password, byName.password)) {
        const count = registerFailure()
        const left = MAX_LOGIN_ATTEMPTS - count
        return {
          success: false,
          error:
            left > 0
              ? `Incorrect password. ${left} attempt${left === 1 ? "" : "s"} remaining before lockout.`
              : "Account locked due to multiple failed attempts. Try again later.",
        }
      }

      // success — clear failed-attempt history
      delete attempts[uname]
      saveLoginAttempts(attempts)
      setCurrentUserId(byName.id)
      saveSession(byName.id)
      return { success: true }
    },
    [data.users],
  )

  const logout = useCallback(() => {
    setCurrentUserId(null)
    clearSession()
  }, [])

  // ---------- users (admin) ----------
  const addUser = useCallback(
    (u: Omit<User, "id" | "password"> & { password: string }) => {
      const username = u.username.trim().toLowerCase()
      if (!username) return { success: false, error: "Username is required." }
      if (!u.password || u.password.length < 4)
        return { success: false, error: "Password must be at least 4 characters." }
      const exists = data.users.some((x) => x.username.toLowerCase() === username)
      if (exists) return { success: false, error: "That username is already taken." }
      const newUser: User = {
        id: uid("user"),
        username,
        password: hashPassword(u.password),
        role: u.role,
        fullName: u.fullName.trim(),
        memberId: u.memberId,
        ministryId: u.ministryId,
      }
      setData((prev) => ({ ...prev, users: [...prev.users, newUser] }))
      return { success: true, user: newUser }
    },
    [data.users],
  )

  const updateUser = useCallback(
    (id: string, u: Partial<Omit<User, "password">> & { password?: string }) => {
      const target = data.users.find((x) => x.id === id)
      if (!target) return { success: false, error: "User not found." }
      if (u.username) {
        const username = u.username.trim().toLowerCase()
        const clash = data.users.some(
          (x) => x.id !== id && x.username.toLowerCase() === username,
        )
        if (clash) return { success: false, error: "That username is already taken." }
      }
      setData((prev) => ({
        ...prev,
        users: prev.users.map((x) => {
          if (x.id !== id) return x
          const next: User = {
            ...x,
            ...u,
            username: (u.username ?? x.username).trim().toLowerCase(),
            password: u.password ? hashPassword(u.password) : x.password,
          }
          return next
        }),
      }))
      return { success: true }
    },
    [data.users],
  )

  const deleteUser = useCallback(
    (id: string) => {
      const target = data.users.find((x) => x.id === id)
      if (!target) return { success: false, error: "User not found." }
      if (target.role === "Administrator") {
        const admins = data.users.filter((u) => u.role === "Administrator")
        if (admins.length <= 1)
          return { success: false, error: "Cannot delete the last Administrator." }
      }
      setData((prev) => ({
        ...prev,
        users: prev.users.filter((x) => x.id !== id),
        // unassign ministry leadership if needed
        ministries: prev.ministries.map((m) =>
          m.leaderId === id ? { ...m, leaderId: undefined } : m,
        ),
      }))
      return { success: true }
    },
    [data.users],
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
    login,
    logout,
    addUser,
    updateUser,
    deleteUser,
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
