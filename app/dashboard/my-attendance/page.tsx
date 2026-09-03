"use client"

import { useMemo } from "react"
import {
  CalendarCheck,
  CheckCircle2,
  XCircle,
  TrendingUp,
  AlertCircle,
} from "lucide-react"
import { useChurch } from "@/lib/church-context"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function MyAttendancePage() {
  const { currentUser, data } = useChurch()
  if (!currentUser) return null

  const memberId = currentUser.memberId

  const { records, present, absent, rate } = useMemo(() => {
    if (!memberId)
      return { records: [], present: 0, absent: 0, rate: 0 }
    const mine = data.attendance.filter((a) => a.memberId === memberId)
    const p = mine.filter((a) => a.status === "Present").length
    const ab = mine.filter((a) => a.status === "Absent").length
    const total = p + ab
    const r = total === 0 ? 0 : Math.round((p / total) * 100)
    return {
      records: [...mine].sort((a, b) => b.attendanceDate.localeCompare(a.attendanceDate)),
      present: p,
      absent: ab,
      rate: r,
    }
  }, [data.attendance, memberId])

  if (!memberId) {
    return (
      <div className="space-y-6">
        <header>
          <h2 className="text-2xl font-semibold">My Attendance</h2>
          <p className="text-sm text-muted-foreground">
            View your attendance history at church events.
          </p>
        </header>
        <Alert>
          <AlertCircle className="size-4" />
          <AlertDescription>
            Your account isn&apos;t linked to a member record yet. Ask an administrator to link
            your account so you can see your attendance.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <div className="size-10 rounded-lg bg-primary text-primary-foreground grid place-items-center">
          <CalendarCheck className="size-5" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold">My Attendance</h2>
          <p className="text-sm text-muted-foreground">
            Your personal attendance record at church events.
          </p>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Present
              </p>
              <p className="text-2xl font-semibold">{present}</p>
            </div>
            <div className="size-10 rounded-lg bg-chart-2/15 text-chart-2 grid place-items-center">
              <CheckCircle2 className="size-5" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Absent
              </p>
              <p className="text-2xl font-semibold">{absent}</p>
            </div>
            <div className="size-10 rounded-lg bg-destructive/15 text-destructive grid place-items-center">
              <XCircle className="size-5" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Attendance Rate
              </p>
              <p className="text-2xl font-semibold">{rate}%</p>
            </div>
            <div className="size-10 rounded-lg bg-accent/20 text-accent grid place-items-center">
              <TrendingUp className="size-5" />
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center py-12 text-muted-foreground"
                    >
                      <CalendarCheck className="size-8 mx-auto mb-2 opacity-50" />
                      No attendance records yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((r) => {
                    const event = data.events.find((e) => e.id === r.eventId)
                    return (
                      <TableRow key={r.id}>
                        <TableCell>{new Date(r.attendanceDate).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium">
                          {event?.name ?? "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant="outline"
                            className={
                              r.status === "Present"
                                ? "bg-chart-2/15 text-chart-2 border-chart-2/40"
                                : "bg-destructive/15 text-destructive border-destructive/40"
                            }
                          >
                            {r.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
