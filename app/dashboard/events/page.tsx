"use client"

import { useMemo, useState } from "react"
import {
  Plus,
  Pencil,
  Trash2,
  CalendarDays,
  MapPin,
  Clock,
  CheckCircle2,
  CircleSlash,
} from "lucide-react"
import { useChurch } from "@/lib/church-context"
import type { Event } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { toast } from "sonner"

interface EventForm {
  name: string
  description: string
  date: string
  time: string
  venue: string
}

const emptyForm: EventForm = {
  name: "",
  description: "",
  date: "",
  time: "",
  venue: "",
}

export default function EventsPage() {
  const {
    data,
    currentUser,
    addEvent,
    updateEvent,
    deleteEvent,
    registerForEvent,
    unregisterFromEvent,
  } = useChurch()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Event | null>(null)
  const [form, setForm] = useState<EventForm>(emptyForm)
  const [errors, setErrors] = useState<Partial<Record<keyof EventForm, string>>>({})
  const [confirmDelete, setConfirmDelete] = useState<Event | null>(null)

  if (!currentUser) return null

  const canManage =
    currentUser.role === "Administrator" || currentUser.role === "Pastor"
  const memberId = currentUser.memberId

  const today = new Date().toISOString().slice(0, 10)
  const { upcoming, past } = useMemo(() => {
    const sorted = [...data.events].sort((a, b) => a.date.localeCompare(b.date))
    return {
      upcoming: sorted.filter((e) => e.date >= today),
      past: sorted.filter((e) => e.date < today).reverse(),
    }
  }, [data.events, today])

  const openNew = () => {
    setEditing(null)
    setForm(emptyForm)
    setErrors({})
    setOpen(true)
  }
  const openEdit = (e: Event) => {
    setEditing(e)
    setForm({
      name: e.name,
      description: e.description,
      date: e.date,
      time: e.time,
      venue: e.venue,
    })
    setErrors({})
    setOpen(true)
  }

  const validate = () => {
    const e: typeof errors = {}
    if (!form.name.trim()) e.name = "Event name is required"
    if (!form.description.trim()) e.description = "Required"

    // date required and not in the past (only enforced for new events)
    if (!form.date) e.date = "Required"
    else if (!editing && form.date < today) e.date = "Event date cannot be in the past"

    if (!form.time) e.time = "Required"
    if (!form.venue.trim()) e.venue = "Venue information is required"

    // no duplicate events on the same date and venue
    if (form.date && form.venue.trim()) {
      const duplicate = data.events.some(
        (ev) =>
          ev.id !== editing?.id &&
          ev.date === form.date &&
          ev.venue.trim().toLowerCase() === form.venue.trim().toLowerCase(),
      )
      if (duplicate) e.venue = "An event already exists at this venue on this date"
    }

    setErrors(e)
    return Object.keys(e).length === 0
  }

  const save = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validate()) return
    if (editing) {
      updateEvent(editing.id, form)
      toast.success("Event updated")
    } else {
      addEvent({ ...form, adminId: currentUser.id })
      toast.success("Event scheduled")
    }
    setOpen(false)
  }

  const handleDelete = () => {
    if (!confirmDelete) return
    deleteEvent(confirmDelete.id)
    toast.success("Event deleted")
    setConfirmDelete(null)
  }

  const handleRegister = (event: Event) => {
    if (!memberId) {
      toast.error("Only registered church members can register for events.")
      return
    }
    if (event.registeredMemberIds.includes(memberId)) {
      unregisterFromEvent(event.id, memberId)
      toast.success(`Unregistered from ${event.name}`)
    } else {
      registerForEvent(event.id, memberId)
      toast.success(`Registered for ${event.name}`)
    }
  }

  const renderEvent = (e: Event) => {
    const registered = memberId ? e.registeredMemberIds.includes(memberId) : false
    return (
      <Card key={e.id} className="overflow-hidden">
        <div className="flex">
          <div className="flex flex-col items-center justify-center w-20 bg-primary text-primary-foreground p-3 shrink-0">
            <span className="text-[10px] uppercase tracking-widest">
              {new Date(e.date).toLocaleString("en", { month: "short" })}
            </span>
            <span className="text-2xl font-semibold">{new Date(e.date).getDate()}</span>
            <span className="text-[10px] text-primary-foreground/70">
              {new Date(e.date).getFullYear()}
            </span>
          </div>
          <div className="flex-1 min-w-0 p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold truncate">{e.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">{e.description}</p>
              </div>
              {canManage && (
                <div className="flex gap-1 shrink-0">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(e)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => setConfirmDelete(e)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" /> {e.time}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5" /> {e.venue}
              </span>
              <Badge variant="secondary" className="font-normal">
                {e.registeredMemberIds.length} registered
              </Badge>
            </div>
            {memberId && e.date >= today && (
              <div className="pt-2">
                <Button
                  size="sm"
                  variant={registered ? "outline" : "default"}
                  onClick={() => handleRegister(e)}
                >
                  {registered ? (
                    <>
                      <CircleSlash className="size-3.5" /> Unregister
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-3.5" /> Register
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Events</h2>
          <p className="text-sm text-muted-foreground">
            {canManage
              ? "Schedule and manage church events."
              : "View upcoming events and register to attend."}
          </p>
        </div>
        {canManage && (
          <Button onClick={openNew}>
            <Plus className="size-4" /> New Event
          </Button>
        )}
      </header>

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" className="space-y-3 mt-4">
          {upcoming.length === 0 ? (
            <Card>
              <CardContent className="p-10 text-center text-muted-foreground">
                <CalendarDays className="size-8 mx-auto mb-2 opacity-50" />
                No upcoming events.
              </CardContent>
            </Card>
          ) : (
            upcoming.map(renderEvent)
          )}
        </TabsContent>
        <TabsContent value="past" className="space-y-3 mt-4">
          {past.length === 0 ? (
            <Card>
              <CardContent className="p-10 text-center text-muted-foreground">
                No past events.
              </CardContent>
            </Card>
          ) : (
            past.map(renderEvent)
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Event" : "Schedule Event"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ename">Event Name *</Label>
              <Input
                id="ename"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edesc">Description *</Label>
              <Textarea
                id="edesc"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
              {errors.description && (
                <p className="text-xs text-destructive">{errors.description}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edate">Date *</Label>
                <Input
                  id="edate"
                  type="date"
                  min={editing ? undefined : today}
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
                {errors.date && <p className="text-xs text-destructive">{errors.date}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="etime">Time *</Label>
                <Input
                  id="etime"
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                />
                {errors.time && <p className="text-xs text-destructive">{errors.time}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="evenue">Venue *</Label>
              <Input
                id="evenue"
                value={form.venue}
                onChange={(e) => setForm({ ...form, venue: e.target.value })}
              />
              {errors.venue && <p className="text-xs text-destructive">{errors.venue}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{editing ? "Save" : "Schedule"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this event?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {confirmDelete?.name} and any related attendance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
