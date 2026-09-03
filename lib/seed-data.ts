import type { DataState } from "./types"

// Simple base64 "hashing" simulation for demo purposes only
const hash = (s: string) => (typeof window !== "undefined" ? btoa(s) : Buffer.from(s).toString("base64"))

export function getSeedData(): DataState {
  const ministries = [
    { id: "min-1", name: "Choir Ministry", description: "Leads worship through song", leaderId: "user-4" },
    { id: "min-2", name: "Youth Ministry", description: "Engages and disciples young people", leaderId: "user-5" },
  ]

  const members = [
    {
      id: "mem-1",
      fullName: "Grace Adeyemi",
      gender: "Female" as const,
      dateOfBirth: "1992-04-12",
      contactNumber: "+234 801 234 5670",
      email: "grace@iuafc.org",
      address: "12 Faith Avenue, Lagos",
      ministryId: "min-1",
      joinDate: "2020-03-15",
    },
    {
      id: "mem-2",
      fullName: "Daniel Okeke",
      gender: "Male" as const,
      dateOfBirth: "1988-09-23",
      contactNumber: "+234 802 345 6781",
      email: "daniel@iuafc.org",
      address: "5 Mercy Street, Abuja",
      ministryId: "min-1",
      joinDate: "2019-11-02",
    },
    {
      id: "mem-3",
      fullName: "Esther Bello",
      gender: "Female" as const,
      dateOfBirth: "2001-07-08",
      contactNumber: "+234 803 456 7892",
      email: "esther@iuafc.org",
      address: "21 Hope Crescent, Ibadan",
      ministryId: "min-2",
      joinDate: "2021-06-20",
    },
    {
      id: "mem-4",
      fullName: "Samuel Johnson",
      gender: "Male" as const,
      dateOfBirth: "1995-12-30",
      contactNumber: "+234 804 567 8903",
      email: "samuel@iuafc.org",
      address: "8 Praise Road, Port Harcourt",
      ministryId: "min-2",
      joinDate: "2022-01-10",
    },
    {
      id: "mem-5",
      fullName: "Ruth Eze",
      gender: "Female" as const,
      dateOfBirth: "1985-02-17",
      contactNumber: "+234 805 678 9014",
      email: "ruth@iuafc.org",
      address: "33 Glory Lane, Enugu",
      ministryId: "min-1",
      joinDate: "2018-08-05",
    },
  ]

  const users = [
    {
      id: "user-1",
      username: "admin",
      password: hash("password"),
      role: "Administrator" as const,
      fullName: "Pastor John Williams",
    },
    {
      id: "user-2",
      username: "pastor",
      password: hash("password"),
      role: "Pastor" as const,
      fullName: "Rev. Michael Adeyemi",
    },
    {
      id: "user-3",
      username: "finance",
      password: hash("password"),
      role: "Finance Officer" as const,
      fullName: "Sister Mary Okafor",
    },
    {
      id: "user-4",
      username: "choirleader",
      password: hash("password"),
      role: "Ministry Leader" as const,
      fullName: "Brother Paul Adewale",
      ministryId: "min-1",
    },
    {
      id: "user-5",
      username: "youthleader",
      password: hash("password"),
      role: "Ministry Leader" as const,
      fullName: "Sister Deborah Nwosu",
      ministryId: "min-2",
    },
    {
      id: "user-6",
      username: "member",
      password: hash("password"),
      role: "Church Member" as const,
      fullName: "Grace Adeyemi",
      memberId: "mem-1",
    },
  ]

  const events = [
    {
      id: "evt-1",
      name: "Sunday Service",
      description: "Weekly Sunday worship and word",
      date: "2026-05-17",
      time: "09:00",
      venue: "Main Sanctuary",
      adminId: "user-1",
      registeredMemberIds: ["mem-1", "mem-2", "mem-3"],
    },
    {
      id: "evt-2",
      name: "Youth Conference",
      description: "Annual gathering for youth empowerment",
      date: "2026-06-14",
      time: "16:00",
      venue: "Fellowship Hall",
      adminId: "user-1",
      registeredMemberIds: ["mem-3", "mem-4"],
    },
  ]

  const donations = [
    {
      id: "don-1",
      memberId: "mem-1",
      amount: 25000,
      donationType: "Tithe" as const,
      paymentMethod: "Transfer" as const,
      donationDate: "2026-05-03",
      financeOfficerId: "user-3",
      receiptNumber: "RCP-1001",
    },
    {
      id: "don-2",
      memberId: "mem-2",
      amount: 5000,
      donationType: "Offering" as const,
      paymentMethod: "Cash" as const,
      donationDate: "2026-05-03",
      financeOfficerId: "user-3",
      receiptNumber: "RCP-1002",
    },
    {
      id: "don-3",
      memberId: "mem-5",
      amount: 50000,
      donationType: "Donation" as const,
      paymentMethod: "Card" as const,
      donationDate: "2026-04-26",
      financeOfficerId: "user-3",
      receiptNumber: "RCP-1003",
    },
  ]

  const announcements = [
    {
      id: "ann-1",
      title: "Welcome to the New Church Management System",
      message:
        "We are excited to launch our new digital platform to serve you better. Please update your profile and explore the features.",
      publishDate: "2026-05-08",
      adminId: "user-1",
    },
    {
      id: "ann-2",
      title: "Choir Rehearsal This Saturday",
      message: "All choir members are invited to rehearsal on Saturday at 4:00 PM in the main sanctuary.",
      publishDate: "2026-05-09",
      adminId: "user-1",
    },
  ]

  const attendance = [
    {
      id: "att-1",
      memberId: "mem-1",
      eventId: "evt-1",
      attendanceDate: "2026-05-10",
      status: "Present" as const,
    },
    {
      id: "att-2",
      memberId: "mem-2",
      eventId: "evt-1",
      attendanceDate: "2026-05-10",
      status: "Present" as const,
    },
    {
      id: "att-3",
      memberId: "mem-5",
      eventId: "evt-1",
      attendanceDate: "2026-05-10",
      status: "Absent" as const,
    },
  ]

  const activities = [
    {
      id: "act-1",
      ministryId: "min-1",
      title: "Choir Robe Renewal Drive",
      description:
        "Request approval to fundraise for new choir robes ahead of the anniversary service.",
      proposedDate: "2026-06-01",
      venue: "Fellowship Hall",
      submittedById: "user-4",
      submittedAt: "2026-05-09T10:30:00.000Z",
      status: "Pending" as const,
    },
    {
      id: "act-2",
      ministryId: "min-2",
      title: "Youth Outreach Weekend",
      description:
        "Two-day evangelism outreach in nearby community with the youth ministry team.",
      proposedDate: "2026-06-20",
      venue: "Community Center",
      submittedById: "user-5",
      submittedAt: "2026-05-05T08:15:00.000Z",
      status: "Approved" as const,
      reviewedById: "user-2",
      reviewedAt: "2026-05-06T09:00:00.000Z",
      reviewNote: "Approved. Coordinate with the welfare team for logistics.",
    },
  ]

  return {
    users,
    members,
    ministries,
    events,
    attendance,
    donations,
    announcements,
    activities,
  }
}
