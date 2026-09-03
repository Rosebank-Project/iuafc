"use client"

import Link from "next/link"
import { useMemo } from "react"
import {
  Bell,
  CalendarDays,
  Megaphone,
  ListChecks,
  HandCoins,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react"
import { useChurch } from "@/lib/church-context"
import type { Role } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type NoticeKind = "event" | "announcement" | "activity-pending" | "activity-reviewed" | "donation"

interface Notice {
  id: string
  kind: NoticeKind
  title: string
  message: string
  date: string // ISO date for sort
  href: string
  iconBg: string
}

function buildNotices(args: {
  role: Role
  userId: string
  memberId?: string
  ministryId?: string
  data: ReturnType<typeof useChurch>["data"]
}): Notice[] {
  const { role, userId, memberId, ministryId, data } = args
  const today = new Date().toISOString().slice(0, 10)
  const notices: Notice[] = []

  // Upcoming events visible to everyone
  for (const e of data.events) {
    if (e.date < today) continue
    notices.push({
      id: `evt-${e.id}`,
      kind: "event",
      title: `Upcoming: ${e.name}`,
      message: `${new Date(e.date).toLocaleDateString()} at ${e.time} — ${e.venue}`,
      date: e.date,
      href: "/dashboard/events",
      iconBg: "bg-primary/10 text-primary",
    })
  }

  // Announcements visible to everyone
  for (const a of data.announcements) {
    notices.push({
      id: `ann-${a.id}`,
      kind: "announcement",
      title: a.title,
      message: a.message,
      date: a.publishDate,
      href: "/dashboard/announcements",
      iconBg: "bg-accent/20 text-accent",
    })
  }

  // Pending activities — pastors/admin only
  if (role === "Administrator" || role === "Pastor") {
    for (const act of data.activities) {
      if (act.status !== "Pending") continue
      const ministry = data.ministries.find((m) => m.id === act.ministryId)
      notices.push({
        id: `act-pend-${act.id}`,
        kind: "activity-pending",
        title: `Approval needed: ${act.title}`,
        message: `${ministry?.name ?? "Ministry"} • proposed ${new Date(
          act.proposedDate,
        ).toLocaleDateString()}`,
        date: act.submittedAt.slice(0, 10),
        href: "/dashboard/activities",
        iconBg: "bg-chart-4/20 text-chart-4",
      })
    }
  }

  // Activity decisions for ministry leaders
  if (role === "Ministry Leader" && ministryId) {
    for (const act of data.activities) {
      if (act.ministryId !== ministryId) continue
      if (act.status === "Pending" || !act.reviewedAt) continue
      notices.push({
        id: `act-rev-${act.id}`,
        kind: "activity-reviewed",
        title: `${act.title} — ${act.status}`,
        message: act.reviewNote ?? `Your activity was ${act.status.toLowerCase()}.`,
        date: act.reviewedAt.slice(0, 10),
        href: "/dashboard/activities",
        iconBg:
          act.status === "Approved"
            ? "bg-chart-2/20 text-chart-2"
            : "bg-destructive/15 text-destructive",
      })
    }
  }

  // Recent donations for finance officer
  if (role === "Finance Officer") {
    const recent = [...data.donations]
      .sort((a, b) => b.donationDate.localeCompare(a.donationDate))
      .slice(0, 5)
    for (const d of recent) {
      const member = data.members.find((m) => m.id === d.memberId)
      notices.push({
        id: `don-${d.id}`,
        kind: "donation",
        title: `${d.donationType} recorded: ZAR ${d.amount.toLocaleString()}`,
        message: `${member?.fullName ?? "—"} • ${d.receiptNumber}`,
        date: d.donationDate,
        href: "/dashboard/donations",
        iconBg: "bg-chart-2/20 text-chart-2",
      })
    }
  }

  // Members see their own upcoming registered events highlighted
  if (role === "Church Member" && memberId) {
    const registered = data.events.filter(
      (e) => e.registeredMemberIds.includes(memberId) && e.date >= today,
    )
    for (const e of registered) {
      notices.push({
        id: `reg-${e.id}`,
        kind: "event",
        title: `You are registered for ${e.name}`,
        message: `Don't forget — ${new Date(e.date).toLocaleDateString()} at ${e.time}`,
        date: e.date,
        href: "/dashboard/events",
        iconBg: "bg-chart-2/20 text-chart-2",
      })
    }
  }

  // Avoid unused warning
  void userId

  return notices.sort((a, b) => b.date.localeCompare(a.date))
}

const KIND_ICON: Record<NoticeKind, React.ComponentType<{ className?: string }>> = {
  event: CalendarDays,
  announcement: Megaphone,
  "activity-pending": Clock,
  "activity-reviewed": CheckCircle2,
  donation: HandCoins,
}

const KIND_LABEL: Record<NoticeKind, string> = {
  event: "Event",
  announcement: "Announcement",
  "activity-pending": "Approval",
  "activity-reviewed": "Activity update",
  donation: "Donation",
}

export default function NotificationsPage() {
  const { currentUser, data } = useChurch()
  if (!currentUser) return null

  const notices = useMemo(
    () =>
      buildNotices({
        role: currentUser.role,
        userId: currentUser.id,
        memberId: currentUser.memberId,
        ministryId: currentUser.ministryId,
        data,
      }),
    [currentUser, data],
  )

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <div className="size-10 rounded-lg bg-primary text-primary-foreground grid place-items-center">
          <Bell className="size-5" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold">Notifications</h2>
          <p className="text-sm text-muted-foreground">
            Updates, reminders, and items needing your attention.
          </p>
        </div>
      </header>

      {notices.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <Bell className="size-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">You&apos;re all caught up.</p>
            <p className="text-sm">There are no notifications right now.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notices.map((n) => {
            const Icon = KIND_ICON[n.kind]
            const isUrgent = n.kind === "activity-pending"
            return (
              <Card
                key={n.id}
                className={cn(
                  "transition hover:bg-secondary/40",
                  isUrgent && "border-chart-4/40",
                )}
              >
                <CardContent className="p-4 flex items-start gap-4">
                  <div
                    className={cn(
                      "size-10 rounded-lg grid place-items-center shrink-0",
                      n.iconBg,
                    )}
                  >
                    <Icon className="size-5" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium leading-tight">{n.title}</p>
                      <Badge variant="outline" className="text-[10px]">
                        {KIND_LABEL[n.kind]}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      {new Date(n.date).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    asChild
                    size="sm"
                    variant="ghost"
                    className="shrink-0 self-center"
                  >
                    <Link href={n.href}>View</Link>
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Suppress unused warning */}
      {false && <XCircle className="size-3 hidden" />}
      {false && <ListChecks className="size-3 hidden" />}
    </div>
  )
}
