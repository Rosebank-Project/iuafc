"use client"

import Link from "next/link"
import { useMemo } from "react"
import {
  Users,
  CalendarDays,
  HandCoins,
  Megaphone,
  HeartHandshake,
  ClipboardCheck,
  TrendingUp,
} from "lucide-react"
import { useChurch } from "@/lib/church-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  accent = false,
}: {
  label: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  hint?: string
  accent?: boolean
}) {
  return (
    <Card className={accent ? "border-accent/40" : undefined}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {label}
            </p>
            <p className="text-2xl font-semibold">{value}</p>
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
          </div>
          <div
            className={`size-10 rounded-lg grid place-items-center shrink-0 ${
              accent ? "bg-accent text-accent-foreground" : "bg-primary/10 text-primary"
            }`}
          >
            <Icon className="size-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const { currentUser, data } = useChurch()
  if (!currentUser) return null

  const upcomingEvents = useMemo(() => {
    const now = new Date().toISOString().slice(0, 10)
    return [...data.events]
      .filter((e) => e.date >= now)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5)
  }, [data.events])

  const recentAnnouncements = useMemo(
    () =>
      [...data.announcements]
        .sort((a, b) => b.publishDate.localeCompare(a.publishDate))
        .slice(0, 3),
    [data.announcements],
  )

  const totalDonations = useMemo(
    () => data.donations.reduce((sum, d) => sum + d.amount, 0),
    [data.donations],
  )

  const role = currentUser.role
  const myMember = currentUser.memberId
    ? data.members.find((m) => m.id === currentUser.memberId)
    : null
  const myMinistry = currentUser.ministryId
    ? data.ministries.find((m) => m.id === currentUser.ministryId)
    : null

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-sm text-muted-foreground">Welcome back,</p>
        <h2 className="text-2xl sm:text-3xl font-semibold text-balance">
          {currentUser.fullName}
        </h2>
        <p className="text-sm text-muted-foreground">
          Here&apos;s what&apos;s happening at the church today.
        </p>
      </header>

      {/* Role-specific stat cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(role === "Administrator" || role === "Pastor") && (
          <>
            <StatCard label="Total Members" value={data.members.length} icon={Users} />
            <StatCard
              label="Ministries"
              value={data.ministries.length}
              icon={HeartHandshake}
            />
            <StatCard
              label="Upcoming Events"
              value={upcomingEvents.length}
              icon={CalendarDays}
            />
            <StatCard
              label="Total Donations"
              value={`ZAR ${totalDonations.toLocaleString()}`}
              icon={HandCoins}
              accent
            />
          </>
        )}
        {role === "Finance Officer" && (
          <>
            <StatCard
              label="Total Donations"
              value={`ZAR ${totalDonations.toLocaleString()}`}
              icon={HandCoins}
              accent
            />
            <StatCard
              label="Donation Records"
              value={data.donations.length}
              icon={TrendingUp}
            />
            <StatCard label="Members" value={data.members.length} icon={Users} />
            <StatCard
              label="Upcoming Events"
              value={upcomingEvents.length}
              icon={CalendarDays}
            />
          </>
        )}
        {role === "Ministry Leader" && (
          <>
            <StatCard
              label="My Ministry"
              value={myMinistry?.name ?? "—"}
              icon={HeartHandshake}
              accent
            />
            <StatCard
              label="Ministry Members"
              value={
                myMinistry
                  ? data.members.filter((m) => m.ministryId === myMinistry.id).length
                  : 0
              }
              icon={Users}
            />
            <StatCard
              label="Attendance Records"
              value={data.attendance.length}
              icon={ClipboardCheck}
            />
            <StatCard
              label="Upcoming Events"
              value={upcomingEvents.length}
              icon={CalendarDays}
            />
          </>
        )}
        {role === "Church Member" && (
          <>
            <StatCard
              label="My Ministry"
              value={
                myMember && myMember.ministryId
                  ? data.ministries.find((m) => m.id === myMember.ministryId)?.name ?? "—"
                  : "Unassigned"
              }
              icon={HeartHandshake}
            />
            <StatCard
              label="Upcoming Events"
              value={upcomingEvents.length}
              icon={CalendarDays}
              accent
            />
            <StatCard
              label="My Donations"
              value={
                myMember
                  ? `ZAR ${data.donations
                      .filter((d) => d.memberId === myMember.id)
                      .reduce((s, d) => s + d.amount, 0)
                      .toLocaleString()}`
                  : "ZAR 0"
              }
              icon={HandCoins}
            />
            <StatCard
              label="Announcements"
              value={data.announcements.length}
              icon={Megaphone}
            />
          </>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        {/* Upcoming events */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="size-4 text-primary" /> Upcoming Events
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/events">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming events scheduled.</p>
            ) : (
              upcomingEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="flex items-start gap-4 p-3 rounded-lg border border-border hover:bg-secondary/50 transition"
                >
                  <div className="flex flex-col items-center justify-center w-14 h-14 rounded-md bg-primary text-primary-foreground shrink-0">
                    <span className="text-[10px] uppercase tracking-wider">
                      {new Date(evt.date).toLocaleString("en", { month: "short" })}
                    </span>
                    <span className="text-lg font-semibold leading-none">
                      {new Date(evt.date).getDate()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{evt.name}</p>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {evt.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {evt.time} • {evt.venue}
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {evt.registeredMemberIds.length} registered
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Announcements */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Megaphone className="size-4 text-primary" /> Announcements
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/announcements">All</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentAnnouncements.length === 0 ? (
              <p className="text-sm text-muted-foreground">No announcements yet.</p>
            ) : (
              recentAnnouncements.map((a) => (
                <div
                  key={a.id}
                  className="p-3 rounded-lg border border-border bg-secondary/40"
                >
                  <p className="font-medium text-sm">{a.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                    {a.message}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-2 uppercase tracking-wider">
                    {new Date(a.publishDate).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
