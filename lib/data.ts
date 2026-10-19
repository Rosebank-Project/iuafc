import type { PostgrestError } from "@supabase/supabase-js"
import { supabase } from "./supabase"
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

// Church data lives in the Supabase tables created by the migrations in the mobile repo
// (Rosebank-Project/iuafc-mobile, supabase/migrations). The tables use snake_case columns;
// these helpers convert them to the camelCase types the pages already use.
// Row Level Security decides what each role can read and change.

export type Result<T = void> = { success: true; data: T } | { success: false; error: string }

/** Turns Supabase/PostgREST errors into messages the user understands. */
export function friendlyDataError(error: PostgrestError | null): string {
  if (!error) return "Something went wrong. Please try again."
  if (!error.code) return "No internet connection. Check your connection and try again."
  switch (error.code) {
    case "42501": // row level security
      return "You don't have permission to do this."
    case "PGRST116": // update/select matched no row (hidden by RLS or already deleted)
      return "You don't have permission to change this record, or it no longer exists."
    case "23505": // unique
      return "This record already exists."
    case "23503": // foreign key
      return "This record is linked to something that no longer exists. Refresh and try again."
    case "23514": // check constraint
      return "Some of the values are not allowed. Check the form and try again."
    default:
      return error.message || "Something went wrong. Please try again."
  }
}

const ok = <T>(data: T): Result<T> => ({ success: true, data })
const fail = (error: PostgrestError | null): Result<never> => ({ success: false, error: friendlyDataError(error) })

// ---------- rows ----------

type MemberRow = {
  id: string
  full_name: string
  gender: "Male" | "Female"
  date_of_birth: string | null
  contact_number: string | null
  email: string | null
  address: string | null
  ministry_id: string | null
  join_date: string
}
type MinistryRow = { id: string; name: string; description: string; leader_id: string | null }
type EventRow = {
  id: string
  name: string
  description: string
  event_date: string
  event_time: string
  venue: string | null
  created_by: string | null
}
type RegistrationRow = { event_id: string; member_id: string }
type AttendanceRow = {
  id: string
  member_id: string
  event_id: string
  attendance_date: string
  status: "Present" | "Absent"
}
type DonationRow = {
  id: string
  member_id: string | null
  amount: number | string
  donation_type: Donation["donationType"]
  payment_method: Donation["paymentMethod"]
  donation_date: string
  recorded_by: string | null
  receipt_number: string
}
type AnnouncementRow = { id: string; title: string; message: string; publish_date: string; created_by: string | null }
type ActivityRow = {
  id: string
  ministry_id: string
  title: string
  description: string
  proposed_date: string
  venue: string
  submitted_by: string | null
  submitted_at: string
  status: MinistryActivity["status"]
  reviewed_by: string | null
  reviewed_at: string | null
  review_note: string | null
}
type DirectoryRow = { id: string; full_name: string; role: Role }

// ---------- row -> page type ----------

const toMember = (r: MemberRow): Member => ({
  id: r.id,
  fullName: r.full_name,
  gender: r.gender,
  dateOfBirth: r.date_of_birth ?? "",
  contactNumber: r.contact_number ?? "",
  email: r.email ?? "",
  address: r.address ?? "",
  ministryId: r.ministry_id ?? undefined,
  joinDate: r.join_date,
})

const toMinistry = (r: MinistryRow): Ministry => ({
  id: r.id,
  name: r.name,
  description: r.description,
  leaderId: r.leader_id ?? undefined,
})

const toEvent = (r: EventRow, registrations: RegistrationRow[] = []): Event => ({
  id: r.id,
  name: r.name,
  description: r.description,
  date: r.event_date,
  time: r.event_time.slice(0, 5), // "09:00:00" -> "09:00"
  venue: r.venue ?? "",
  adminId: r.created_by ?? "",
  registeredMemberIds: registrations.filter((x) => x.event_id === r.id).map((x) => x.member_id),
})

const toAttendance = (r: AttendanceRow): Attendance => ({
  id: r.id,
  memberId: r.member_id,
  eventId: r.event_id,
  attendanceDate: r.attendance_date,
  status: r.status,
})

const toDonation = (r: DonationRow): Donation => ({
  id: r.id,
  memberId: r.member_id ?? "",
  amount: Number(r.amount),
  donationType: r.donation_type,
  paymentMethod: r.payment_method,
  donationDate: r.donation_date,
  financeOfficerId: r.recorded_by ?? "",
  receiptNumber: r.receipt_number,
})

const toAnnouncement = (r: AnnouncementRow): Announcement => ({
  id: r.id,
  title: r.title,
  message: r.message,
  publishDate: r.publish_date,
  adminId: r.created_by ?? "",
})

const toActivity = (r: ActivityRow): MinistryActivity => ({
  id: r.id,
  ministryId: r.ministry_id,
  title: r.title,
  description: r.description,
  proposedDate: r.proposed_date,
  venue: r.venue,
  submittedById: r.submitted_by ?? "",
  submittedAt: r.submitted_at,
  status: r.status,
  reviewedById: r.reviewed_by ?? undefined,
  reviewedAt: r.reviewed_at ?? undefined,
  reviewNote: r.review_note ?? undefined,
})

/** Names of every account, for "written by", "leader", "recorded by" (no emails). */
const toDirectoryUser = (r: DirectoryRow): User => ({ id: r.id, username: "", fullName: r.full_name, role: r.role })

// ---------- page type -> columns ----------

/** Copies only the fields that are present, renamed to their column names. */
function columns<T extends object>(value: Partial<T>, names: Partial<Record<keyof T, string>>) {
  const row: Record<string, unknown> = {}
  for (const [key, column] of Object.entries(names) as [keyof T, string][]) {
    if (key in value) {
      const v = value[key]
      row[column] = v === "" || v === undefined ? null : v
    }
  }
  return row
}

const MEMBER_COLUMNS: Partial<Record<keyof Member, string>> = {
  fullName: "full_name",
  gender: "gender",
  dateOfBirth: "date_of_birth",
  contactNumber: "contact_number",
  email: "email",
  address: "address",
  ministryId: "ministry_id",
  joinDate: "join_date",
}
const MINISTRY_COLUMNS: Partial<Record<keyof Ministry, string>> = {
  name: "name",
  description: "description",
  leaderId: "leader_id",
}
const EVENT_COLUMNS: Partial<Record<keyof Event, string>> = {
  name: "name",
  description: "description",
  date: "event_date",
  time: "event_time",
  venue: "venue",
  adminId: "created_by",
}
const ANNOUNCEMENT_COLUMNS: Partial<Record<keyof Announcement, string>> = {
  title: "title",
  message: "message",
  publishDate: "publish_date",
  adminId: "created_by",
}

// Columns that are "not null default ''" in the database must not be sent as null.
const withText = (row: Record<string, unknown>, ...names: string[]) => {
  for (const n of names) if (n in row && row[n] === null) row[n] = ""
  return row
}

// ---------- reading ----------

/** Loads everything the signed-in user is allowed to see. */
export async function loadChurchData(): Promise<Result<DataState>> {
  const [directory, members, ministries, events, registrations, attendance, donations, announcements, activities] =
    await Promise.all([
      supabase.rpc("profile_directory"),
      supabase.from("members").select("*").order("full_name"),
      supabase.from("ministries").select("*").order("name"),
      supabase.from("events").select("*").order("event_date"),
      supabase.from("event_registrations").select("event_id, member_id"),
      supabase.from("attendance").select("*"),
      supabase.from("donations").select("*").order("donation_date", { ascending: false }),
      supabase.from("announcements").select("*").order("publish_date", { ascending: false }),
      supabase.from("ministry_activities").select("*").order("proposed_date"),
    ])

  const failed = [directory, members, ministries, events, registrations, attendance, donations, announcements, activities]
    .find((r) => r.error)
  if (failed) return fail(failed.error)

  const regs = (registrations.data ?? []) as RegistrationRow[]
  return ok({
    users: ((directory.data ?? []) as DirectoryRow[]).map(toDirectoryUser),
    members: ((members.data ?? []) as MemberRow[]).map(toMember),
    ministries: ((ministries.data ?? []) as MinistryRow[]).map(toMinistry),
    events: ((events.data ?? []) as EventRow[]).map((e) => toEvent(e, regs)),
    attendance: ((attendance.data ?? []) as AttendanceRow[]).map(toAttendance),
    donations: ((donations.data ?? []) as DonationRow[]).map(toDonation),
    announcements: ((announcements.data ?? []) as AnnouncementRow[]).map(toAnnouncement),
    activities: ((activities.data ?? []) as ActivityRow[]).map(toActivity),
  })
}

// ---------- members ----------

export async function insertMember(m: Omit<Member, "id">): Promise<Result<Member>> {
  const { data, error } = await supabase.from("members").insert(columns(m, MEMBER_COLUMNS)).select().single()
  return error ? fail(error) : ok(toMember(data as MemberRow))
}

export async function updateMemberRow(id: string, m: Partial<Member>): Promise<Result<Member>> {
  const { data, error } = await supabase.from("members").update(columns(m, MEMBER_COLUMNS)).eq("id", id).select().single()
  return error ? fail(error) : ok(toMember(data as MemberRow))
}

// ---------- ministries ----------

export async function insertMinistry(m: Omit<Ministry, "id">): Promise<Result<Ministry>> {
  const row = withText(columns(m, MINISTRY_COLUMNS), "description")
  const { data, error } = await supabase.from("ministries").insert(row).select().single()
  return error ? fail(error) : ok(toMinistry(data as MinistryRow))
}

export async function updateMinistryRow(id: string, m: Partial<Ministry>): Promise<Result<Ministry>> {
  const row = withText(columns(m, MINISTRY_COLUMNS), "description")
  const { data, error } = await supabase.from("ministries").update(row).eq("id", id).select().single()
  return error ? fail(error) : ok(toMinistry(data as MinistryRow))
}

// ---------- events ----------

export async function insertEvent(e: Omit<Event, "id" | "registeredMemberIds">): Promise<Result<Event>> {
  const row = withText(columns(e, EVENT_COLUMNS), "description")
  const { data, error } = await supabase.from("events").insert(row).select().single()
  return error ? fail(error) : ok(toEvent(data as EventRow))
}

export async function updateEventRow(id: string, e: Partial<Event>): Promise<Result<void>> {
  const row = withText(columns(e, EVENT_COLUMNS), "description")
  const { error } = await supabase.from("events").update(row).eq("id", id).select("id").single()
  return error ? fail(error) : ok(undefined)
}

export async function insertRegistration(eventId: string, memberId: string): Promise<Result<void>> {
  const { error } = await supabase
    .from("event_registrations")
    .upsert({ event_id: eventId, member_id: memberId }, { onConflict: "event_id,member_id", ignoreDuplicates: true })
  return error ? fail(error) : ok(undefined)
}

export async function deleteRegistration(eventId: string, memberId: string): Promise<Result<void>> {
  const { error } = await supabase.from("event_registrations").delete().eq("event_id", eventId).eq("member_id", memberId)
  return error ? fail(error) : ok(undefined)
}

// ---------- attendance ----------

/** Saves attendance; a member has one record per event, so recording again replaces it. */
export async function upsertAttendance(records: Omit<Attendance, "id">[], recordedBy: string): Promise<Result<Attendance[]>> {
  const rows = records.map((a) => ({
    member_id: a.memberId,
    event_id: a.eventId,
    attendance_date: a.attendanceDate,
    status: a.status,
    recorded_by: recordedBy,
  }))
  const { data, error } = await supabase.from("attendance").upsert(rows, { onConflict: "event_id,member_id" }).select()
  return error ? fail(error) : ok(((data ?? []) as AttendanceRow[]).map(toAttendance))
}

// ---------- donations ----------

/** The database assigns the receipt number (RCP-1001, RCP-1002, ...). */
export async function insertDonation(d: Omit<Donation, "id" | "receiptNumber">): Promise<Result<Donation>> {
  const { data, error } = await supabase
    .from("donations")
    .insert({
      member_id: d.memberId,
      amount: d.amount,
      donation_type: d.donationType,
      payment_method: d.paymentMethod,
      donation_date: d.donationDate,
      recorded_by: d.financeOfficerId || null,
    })
    .select()
    .single()
  return error ? fail(error) : ok(toDonation(data as DonationRow))
}

// ---------- announcements ----------

export async function insertAnnouncement(a: Omit<Announcement, "id">): Promise<Result<Announcement>> {
  const { data, error } = await supabase
    .from("announcements")
    .insert(columns(a, ANNOUNCEMENT_COLUMNS))
    .select()
    .single()
  return error ? fail(error) : ok(toAnnouncement(data as AnnouncementRow))
}

export async function updateAnnouncementRow(id: string, a: Partial<Announcement>): Promise<Result<Announcement>> {
  const { data, error } = await supabase
    .from("announcements")
    .update(columns(a, ANNOUNCEMENT_COLUMNS))
    .eq("id", id)
    .select()
    .single()
  return error ? fail(error) : ok(toAnnouncement(data as AnnouncementRow))
}

// ---------- ministry activities ----------

export async function insertActivity(
  a: Omit<MinistryActivity, "id" | "submittedAt" | "status">,
): Promise<Result<MinistryActivity>> {
  const { data, error } = await supabase
    .from("ministry_activities")
    .insert({
      ministry_id: a.ministryId,
      title: a.title,
      description: a.description ?? "",
      proposed_date: a.proposedDate,
      venue: a.venue,
      submitted_by: a.submittedById,
      status: "Pending",
    })
    .select()
    .single()
  return error ? fail(error) : ok(toActivity(data as ActivityRow))
}

export async function reviewActivityRow(
  id: string,
  decision: "Approved" | "Rejected",
  reviewerId: string,
  note?: string,
): Promise<Result<MinistryActivity>> {
  const { data, error } = await supabase
    .from("ministry_activities")
    .update({ status: decision, reviewed_by: reviewerId, reviewed_at: new Date().toISOString(), review_note: note ?? null })
    .eq("id", id)
    .select()
    .single()
  return error ? fail(error) : ok(toActivity(data as ActivityRow))
}

// ---------- delete (any table) ----------

type Table = "members" | "ministries" | "events" | "donations" | "announcements" | "ministry_activities"

/** Deletes a row. Checks that a row was really removed, because RLS hides rows silently. */
export async function deleteRow(table: Table, id: string): Promise<Result<void>> {
  const { data, error } = await supabase.from(table).delete().eq("id", id).select("id")
  if (error) return fail(error)
  if (!data || data.length === 0) return { success: false, error: "You don't have permission to do this." }
  return ok(undefined)
}
