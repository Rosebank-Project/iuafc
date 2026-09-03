"use client"

import { useMemo, useState } from "react"
import { Plus, Pencil, Trash2, Megaphone } from "lucide-react"
import { useChurch } from "@/lib/church-context"
import type { Announcement } from "@/lib/types"
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
import { toast } from "sonner"

interface FormState {
  title: string
  message: string
  publishDate: string
}

const today = () => new Date().toISOString().slice(0, 10)
const empty: FormState = { title: "", message: "", publishDate: today() }

export default function AnnouncementsPage() {
  const { data, currentUser, addAnnouncement, updateAnnouncement, deleteAnnouncement } =
    useChurch()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Announcement | null>(null)
  const [form, setForm] = useState<FormState>(empty)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [confirmDelete, setConfirmDelete] = useState<Announcement | null>(null)

  if (!currentUser) return null
  const canManage = currentUser.role === "Administrator"

  const sorted = useMemo(
    () => [...data.announcements].sort((a, b) => b.publishDate.localeCompare(a.publishDate)),
    [data.announcements],
  )

  const openNew = () => {
    setEditing(null)
    setForm(empty)
    setErrors({})
    setOpen(true)
  }
  const openEdit = (a: Announcement) => {
    setEditing(a)
    setForm({ title: a.title, message: a.message, publishDate: a.publishDate })
    setErrors({})
    setOpen(true)
  }

  const validate = () => {
    const e: typeof errors = {}
    if (!form.title.trim()) e.title = "Title is required"
    if (!form.message.trim()) e.message = "Message is required"
    if (!form.publishDate) e.publishDate = "Date is required"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const save = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validate()) return
    if (editing) {
      updateAnnouncement(editing.id, form)
      toast.success("Announcement updated")
    } else {
      addAnnouncement({ ...form, adminId: currentUser.id })
      toast.success("Announcement posted")
    }
    setOpen(false)
  }

  const handleDelete = () => {
    if (!confirmDelete) return
    deleteAnnouncement(confirmDelete.id)
    toast.success("Announcement removed")
    setConfirmDelete(null)
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Announcements</h2>
          <p className="text-sm text-muted-foreground">
            {canManage
              ? "Post messages to keep the congregation informed."
              : "Latest messages from the church leadership."}
          </p>
        </div>
        {canManage && (
          <Button onClick={openNew}>
            <Plus className="size-4" /> New Announcement
          </Button>
        )}
      </header>

      <div className="space-y-3">
        {sorted.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center text-muted-foreground">
              <Megaphone className="size-8 mx-auto mb-2 opacity-50" />
              No announcements yet.
            </CardContent>
          </Card>
        ) : (
          sorted.map((a) => {
            const author = data.users.find((u) => u.id === a.adminId)
            return (
              <Card key={a.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base">{a.title}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(a.publishDate).toLocaleDateString("en", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                      {author && <> • {author.fullName}</>}
                    </p>
                  </div>
                  {canManage && (
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(a)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => setConfirmDelete(a)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{a.message}</p>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Announcement" : "New Announcement"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="atitle">Title *</Label>
              <Input
                id="atitle"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
              {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="amsg">Message *</Label>
              <Textarea
                id="amsg"
                rows={5}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
              />
              {errors.message && <p className="text-xs text-destructive">{errors.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="adate">Publish Date *</Label>
              <Input
                id="adate"
                type="date"
                value={form.publishDate}
                onChange={(e) => setForm({ ...form, publishDate: e.target.value })}
              />
              {errors.publishDate && (
                <p className="text-xs text-destructive">{errors.publishDate}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{editing ? "Save" : "Post"}</Button>
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
            <AlertDialogTitle>Delete this announcement?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.title} will be permanently removed.
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
