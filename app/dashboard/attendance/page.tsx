"use client"

import { useMemo, useState } from "react"
import { ClipboardCheck, FileDown, Save, Filter } from "lucide-react"
import { useChurch } from "@/lib/church-context"
import { exportTablePDF } from "@/lib/pdf"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { toast } from "sonner"

export default function AttendancePage() {
  const { data, currentUser, bulkRecordAttendance } = useChurch()
  if (!currentUser) return null

  const isLeader = currentUser.role === "Ministry Leader"

  // Members visible for capture: leaders only see their ministry
  const captureableMembers = useMemo(() => {
    if (isLeader && currentUser.ministryId) {
      return data.members.filter((m) => m.ministryId === currentUser.ministryId)
    }
    return data.members
  }, [data.members, isLeader, currentUser.ministryId])

  const today = new Date().toISOString().slice(0, 10)
  const firstEvent = data.events[0]
  const [eventId, setEventId] = useState<string>(firstEvent?.id ?? "")
  const [date, setDate] = useState(firstEvent?.date ?? today)
  const [statusMap, setStatusMap] = useState<Record<string, "Present" | "Absent">>({})

  const selectedEvent = data.events.find((e) => e.id === eventId)

  // selecting an event auto-fills the attendance date to match the event
  const handleEventChange = (id: string) => {
    setEventId(id)
    const evt = data.events.find((e) => e.id === id)
    if (evt) setDate(evt.date)
  }

  const handleStatus = (memberId: string, status: "Present" | "Absent") =>
    setStatusMap((prev) => ({ ...prev, [memberId]: status }))

  const submit = () => {
    // event must be an existing event
    if (!eventId || !selectedEvent) {
      toast.error("Select a valid event")
      return
    }
    // attendance date must match the event date
    if (date !== selectedEvent.date) {
      toast.error("Attendance date must match the selected event's date")
      return
    }
    // a status must be selected for every member before saving
    const missing = captureableMembers.filter((m) => !statusMap[m.id])
    if (missing.length > 0) {
      toast.error("Select a status (Present/Absent) for every member before saving")
      return
    }
    // only records for registered members in the system are saved
    const records = captureableMembers.map((m) => ({
      memberId: m.id,
      eventId,
      attendanceDate: date,
      status: statusMap[m.id],
    }))
    bulkRecordAttendance(records)
    toast.success(`Attendance recorded for ${records.length} members`)
    setStatusMap({})
  }

  // Reports
  const [filterEvent, setFilterEvent] = useState<string>("all")
  const [filterMinistry, setFilterMinistry] = useState<string>("all")
  const [from, setFrom] = useState<string>("")
  const [to, setTo] = useState<string>("")

  const filteredAttendance = useMemo(() => {
    return data.attendance
      .filter((a) => {
        if (filterEvent !== "all" && a.eventId !== filterEvent) return false
        if (from && a.attendanceDate < from) return false
        if (to && a.attendanceDate > to) return false
        if (filterMinistry !== "all") {
          const member = data.members.find((m) => m.id === a.memberId)
          if (member?.ministryId !== filterMinistry) return false
        }
        if (isLeader && currentUser.ministryId) {
          const member = data.members.find((m) => m.id === a.memberId)
          if (member?.ministryId !== currentUser.ministryId) return false
        }
        return true
      })
      .sort((a, b) => b.attendanceDate.localeCompare(a.attendanceDate))
  }, [
    data.attendance,
    data.members,
    filterEvent,
    filterMinistry,
    from,
    to,
    isLeader,
    currentUser.ministryId,
  ])

  const exportPDF = () => {
    const head = [["Date", "Event", "Member", "Ministry", "Status"]]
    const body = filteredAttendance.map((a) => {
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
    const meta: string[] = []
    if (from || to) meta.push(`Period: ${from || "—"} to ${to || "—"}`)
    if (filterEvent !== "all") {
      const e = data.events.find((x) => x.id === filterEvent)
      meta.push(`Event: ${e?.name ?? "—"}`)
    }
    if (filterMinistry !== "all") {
      const m = data.ministries.find((x) => x.id === filterMinistry)
      meta.push(`Ministry: ${m?.name ?? "—"}`)
    }
    meta.push(`Total records: ${filteredAttendance.length}`)
    exportTablePDF({
      title: "Attendance Report",
      fileName: `attendance-report-${Date.now()}.pdf`,
      head,
      body,
      meta,
    })
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold">Attendance</h2>
        <p className="text-sm text-muted-foreground">
          {isLeader
            ? "Record and review attendance for your ministry."
            : "Capture attendance and generate reports."}
        </p>
      </header>

      <Tabs defaultValue="capture">
        <TabsList>
          <TabsTrigger value="capture">Capture</TabsTrigger>
          <TabsTrigger value="report">Reports</TabsTrigger>
        </TabsList>

        {/* Capture */}
        <TabsContent value="capture" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardCheck className="size-4 text-primary" /> Record Attendance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Event *</Label>
                  <Select value={eventId} onValueChange={handleEventChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select event" />
                    </SelectTrigger>
                    <SelectContent>
                      {data.events.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.name} — {new Date(e.date).toLocaleDateString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adate">Attendance Date *</Label>
                  <Input id="adate" type="date" value={date} readOnly disabled />
                  <p className="text-xs text-muted-foreground">
                    Date is locked to the selected event.
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead className="hidden sm:table-cell">Ministry</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {captureableMembers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-10">
                          No members available.
                        </TableCell>
                      </TableRow>
                    ) : (
                      captureableMembers.map((m) => {
                        const min = data.ministries.find((x) => x.id === m.ministryId)
                        return (
                          <TableRow key={m.id}>
                            <TableCell className="font-medium">{m.fullName}</TableCell>
                            <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                              {min?.name ?? "—"}
                            </TableCell>
                            <TableCell>
                              <RadioGroup
                                value={statusMap[m.id] ?? ""}
                                onValueChange={(v) => handleStatus(m.id, v as "Present" | "Absent")}
                                className="flex gap-4"
                              >
                                <Label className="flex items-center gap-2 cursor-pointer font-normal">
                                  <RadioGroupItem value="Present" id={`p-${m.id}`} />
                                  <span className="text-emerald-700">Present</span>
                                </Label>
                                <Label className="flex items-center gap-2 cursor-pointer font-normal">
                                  <RadioGroupItem value="Absent" id={`a-${m.id}`} />
                                  <span className="text-muted-foreground">Absent</span>
                                </Label>
                              </RadioGroup>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end">
                <Button onClick={submit} disabled={!eventId || captureableMembers.length === 0}>
                  <Save className="size-4" /> Save Attendance
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Report */}
        <TabsContent value="report" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="size-4 text-primary" /> Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-2">
                <Label>Event</Label>
                <Select value={filterEvent} onValueChange={setFilterEvent}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All events</SelectItem>
                    {data.events.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {!isLeader && (
                <div className="space-y-2">
                  <Label>Ministry</Label>
                  <Select value={filterMinistry} onValueChange={setFilterMinistry}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All ministries</SelectItem>
                      {data.ministries.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>From</Label>
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>To</Label>
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">
                Records ({filteredAttendance.length})
              </CardTitle>
              <Button
                variant="outline"
                onClick={exportPDF}
                disabled={filteredAttendance.length === 0}
              >
                <FileDown className="size-4" /> Export PDF
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Member</TableHead>
                      <TableHead className="hidden sm:table-cell">Ministry</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAttendance.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                          No records match the filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAttendance.map((a) => {
                        const m = data.members.find((x) => x.id === a.memberId)
                        const e = data.events.find((x) => x.id === a.eventId)
                        const min = m?.ministryId
                          ? data.ministries.find((x) => x.id === m.ministryId)
                          : null
                        return (
                          <TableRow key={a.id}>
                            <TableCell className="text-sm">
                              {new Date(a.attendanceDate).toLocaleDateString()}
                            </TableCell>
                            <TableCell>{e?.name ?? "—"}</TableCell>
                            <TableCell className="font-medium">
                              {m?.fullName ?? "—"}
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                              {min?.name ?? "—"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={a.status === "Present" ? "default" : "secondary"}
                                className={
                                  a.status === "Present"
                                    ? "bg-emerald-600 hover:bg-emerald-600"
                                    : ""
                                }
                              >
                                {a.status}
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
        </TabsContent>
      </Tabs>
    </div>
  )
}
