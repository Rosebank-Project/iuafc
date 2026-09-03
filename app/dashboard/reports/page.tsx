"use client"

import { useState } from "react"
import { FileBarChart, FileDown, Users, ClipboardCheck, HandCoins, CalendarRange } from "lucide-react"
import { useChurch } from "@/lib/church-context"
import { exportTablePDF } from "@/lib/pdf"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

export default function ReportsPage() {
  const { data, currentUser } = useChurch()
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")

  // Only authorized roles may generate reports
  const authorized =
    currentUser?.role === "Administrator" || currentUser?.role === "Pastor"

  if (!currentUser) return null

  if (!authorized) {
    return (
      <div className="space-y-6">
        <header>
          <h2 className="text-2xl font-semibold">Reports</h2>
        </header>
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            You are not authorized to generate reports.
          </CardContent>
        </Card>
      </div>
    )
  }

  // Validates the date range shared by all reports
  const validateRange = (): boolean => {
    if (!from || !to) {
      toast.error("Select both a Start Date and an End Date")
      return false
    }
    if (from > to) {
      toast.error("Start Date cannot be later than End Date")
      return false
    }
    return true
  }

  const inRange = (date: string) => date >= from && date <= to
  const rangeMeta = `Period: ${from} to ${to}`

  const exportMembers = () => {
    if (!validateRange()) return
    const members = data.members.filter((m) => inRange(m.joinDate))
    if (members.length === 0) return toast.error("No members joined within the selected period")
    const head = [["Name", "Gender", "Phone", "Email", "Ministry", "Join Date"]]
    const body = members.map((m) => {
      const min = data.ministries.find((x) => x.id === m.ministryId)
      return [
        m.fullName,
        m.gender,
        m.contactNumber,
        m.email,
        min?.name ?? "—",
        new Date(m.joinDate).toLocaleDateString(),
      ]
    })
    exportTablePDF({
      title: "Member Directory",
      fileName: `member-directory-${Date.now()}.pdf`,
      head,
      body,
      meta: [rangeMeta, `Total members: ${members.length}`],
    })
    toast.success("Member directory exported")
  }

  const exportAttendance = () => {
    if (!validateRange()) return
    const attendance = data.attendance.filter((a) => inRange(a.attendanceDate))
    if (attendance.length === 0) return toast.error("No attendance within the selected period")
    const head = [["Date", "Event", "Member", "Ministry", "Status"]]
    const body = attendance
      .slice()
      .sort((a, b) => b.attendanceDate.localeCompare(a.attendanceDate))
      .map((a) => {
        const m = data.members.find((x) => x.id === a.memberId)
        const e = data.events.find((x) => x.id === a.eventId)
        const min = m?.ministryId ? data.ministries.find((x) => x.id === m.ministryId) : null
        return [
          new Date(a.attendanceDate).toLocaleDateString(),
          e?.name ?? "—",
          m?.fullName ?? "—",
          min?.name ?? "—",
          a.status,
        ]
      })
    exportTablePDF({
      title: "Attendance Report",
      fileName: `attendance-report-${Date.now()}.pdf`,
      head,
      body,
      meta: [rangeMeta, `Total records: ${attendance.length}`],
    })
    toast.success("Attendance report exported")
  }

  const exportFinance = () => {
    if (!validateRange()) return
    const donations = data.donations.filter((d) => inRange(d.donationDate))
    if (donations.length === 0) return toast.error("No donations within the selected period")
    const head = [["Date", "Receipt", "Member", "Type", "Method", "Amount (ZAR)"]]
    const total = donations.reduce((s, d) => s + d.amount, 0)
    const body = donations
      .slice()
      .sort((a, b) => b.donationDate.localeCompare(a.donationDate))
      .map((d) => {
        const m = data.members.find((x) => x.id === d.memberId)
        return [
          new Date(d.donationDate).toLocaleDateString(),
          d.receiptNumber,
          m?.fullName ?? "—",
          d.donationType,
          d.paymentMethod,
          d.amount.toLocaleString(),
        ]
      })
    body.push(["", "", "", "", "TOTAL", total.toLocaleString()])
    exportTablePDF({
      title: "Financial Report",
      fileName: `financial-report-${Date.now()}.pdf`,
      head,
      body,
      meta: [rangeMeta, `Total donations: ZAR ${total.toLocaleString()}`, `Records: ${donations.length}`],
    })
    toast.success("Financial report exported")
  }

  const reports = [
    {
      title: "Member Directory",
      description: "Complete list of all church members with their contact details and ministry assignments.",
      icon: Users,
      count: data.members.length,
      countLabel: "members",
      action: exportMembers,
    },
    {
      title: "Attendance Report",
      description: "Full attendance history across all events, members, and ministries.",
      icon: ClipboardCheck,
      count: data.attendance.length,
      countLabel: "records",
      action: exportAttendance,
    },
    {
      title: "Financial Report",
      description: "Complete donation history with totals by type and payment method.",
      icon: HandCoins,
      count: data.donations.length,
      countLabel: "donations",
      action: exportFinance,
    },
  ]

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold">Reports</h2>
        <p className="text-sm text-muted-foreground">
          Select a reporting period, then generate and export PDF reports.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarRange className="size-4 text-primary" /> Reporting Period
          </CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-3 max-w-md">
          <div className="space-y-2">
            <Label htmlFor="from">Start Date *</Label>
            <Input id="from" type="date" max={to || undefined} value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="to">End Date *</Label>
            <Input id="to" type="date" min={from || undefined} value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {reports.map((r) => {
          const Icon = r.icon
          return (
            <Card key={r.title} className="flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-primary/10 text-primary grid place-items-center">
                    <Icon className="size-5" />
                  </div>
                  <CardTitle className="text-base">{r.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 justify-between gap-4">
                <p className="text-sm text-muted-foreground leading-relaxed">{r.description}</p>
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <span className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">{r.count}</span>{" "}
                    {r.countLabel}
                  </span>
                  <Button onClick={r.action} disabled={r.count === 0}>
                    <FileDown className="size-4" /> Export
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileBarChart className="size-4 text-primary" /> Quick Statistics
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Total Members" value={data.members.length} />
          <Stat label="Active Ministries" value={data.ministries.length} />
          <Stat label="Events" value={data.events.length} />
          <Stat
            label="Total Donations"
            value={`ZAR ${data.donations.reduce((s, d) => s + d.amount, 0).toLocaleString()}`}
          />
        </CardContent>
      </Card>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border p-4 bg-secondary/30">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
    </div>
  )
}
