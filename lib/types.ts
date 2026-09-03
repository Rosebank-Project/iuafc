export type Role = "Administrator" | "Pastor" | "Finance Officer" | "Ministry Leader" | "Church Member"

export interface User {
  id: string
  username: string
  password: string // base64 encoded for demo
  role: Role
  fullName: string
  memberId?: string // links to Member if Member role
  ministryId?: string // links to Ministry if Ministry Leader
}

export interface Member {
  id: string
  fullName: string
  gender: "Male" | "Female"
  dateOfBirth: string
  contactNumber: string
  email: string
  address: string
  ministryId?: string
  joinDate: string
}

export interface Ministry {
  id: string
  name: string
  description: string
  leaderId?: string // userId
}

export interface Event {
  id: string
  name: string
  description: string
  date: string
  time: string
  venue: string
  adminId: string
  registeredMemberIds: string[]
}

export interface Attendance {
  id: string
  memberId: string
  eventId: string
  attendanceDate: string
  status: "Present" | "Absent"
}

export interface Donation {
  id: string
  memberId: string
  amount: number
  donationType: "Tithe" | "Offering" | "Donation"
  paymentMethod: "Cash" | "Card" | "Transfer"
  donationDate: string
  financeOfficerId: string
  receiptNumber: string
}

export interface Announcement {
  id: string
  title: string
  message: string
  publishDate: string
  adminId: string
}

export type ActivityStatus = "Pending" | "Approved" | "Rejected"

export interface MinistryActivity {
  id: string
  ministryId: string
  title: string
  description: string
  proposedDate: string
  venue: string
  submittedById: string // userId of ministry leader
  submittedAt: string
  status: ActivityStatus
  reviewedById?: string
  reviewedAt?: string
  reviewNote?: string
}

export interface DataState {
  users: User[]
  members: Member[]
  ministries: Ministry[]
  events: Event[]
  attendance: Attendance[]
  donations: Donation[]
  announcements: Announcement[]
  activities: MinistryActivity[]
}
