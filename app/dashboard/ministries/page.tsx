"use client"

import { useState } from "react"
import { Plus, Pencil, Trash2, HeartHandshake, Users } from "lucide-react"
import { useChurch } from "@/lib/church-context"
import type { Ministry } from "@/lib/types"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

export default function MinistriesPage() {
  const { data, currentUser, addMinistry, updateMinistry, deleteMinistry } = useChurch()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Ministry | null>(null)
  const [form, setForm] = useState({ name: "", description: "", leaderId: "none" })
  const [errors, setErrors] = useState<{ name?: string; description?: string }>({})
  const [confirmDelete, setConfirmDelete] = useState<Ministry | null>(null)

  if (!currentUser) return null
  const canManage = currentUser.role === "Administrator"

  // Ministry leaders only see their ministry
  const visibleMinistries =
    currentUser.role === "Ministry Leader" && currentUser.ministryId
      ? data.ministries.filter((m) => m.id === currentUser.ministryId)
      : data.ministries

  const ministryLeaders = data.users.filter((u) => u.role === "Ministry Leader")

  const openNew = () => {
    setEditing(null)
    setForm({ name: "", description: "", leaderId: "none" })
    setErrors({})
    setOpen(true)
  }

  const openEdit = (m: Ministry) => {
    setEditing(m)
    setForm({
      name: m.name,
      description: m.description,
      leaderId: m.leaderId ?? "none",
    })
    setErrors({})
    setOpen(true)
  }

  const validate = () => {
    const e: typeof errors = {}
    if (!form.name.trim()) e.name = "Name is required"
    if (!form.description.trim()) e.description = "Description is required"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const save = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validate()) return
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      leaderId: form.leaderId === "none" ? undefined : form.leaderId,
    }
    if (editing) {
      updateMinistry(editing.id, payload)
      toast.success("Ministry updated")
    } else {
      addMinistry(payload)
      toast.success("Ministry created")
    }
    setOpen(false)
  }

  const handleDelete = () => {
    if (!confirmDelete) return
    deleteMinistry(confirmDelete.id)
    toast.success(`${confirmDelete.name} deleted`)
    setConfirmDelete(null)
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Ministries</h2>
          <p className="text-sm text-muted-foreground">
            {currentUser.role === "Ministry Leader"
              ? "Your ministry and its members."
              : "Manage church ministries and assign leaders."}
          </p>
        </div>
        {canManage && (
          <Button onClick={openNew}>
            <Plus className="size-4" /> Add Ministry
          </Button>
        )}
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {visibleMinistries.length === 0 ? (
          <Card className="md:col-span-2">
            <CardContent className="p-10 text-center text-muted-foreground">
              No ministries yet.
            </CardContent>
          </Card>
        ) : (
          visibleMinistries.map((m) => {
            const leader = data.users.find((u) => u.id === m.leaderId)
            const members = data.members.filter((mem) => mem.ministryId === m.id)
            return (
              <Card key={m.id} className="overflow-hidden">
                <CardHeader className="bg-secondary/40 border-b border-border">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="size-10 rounded-lg bg-accent text-accent-foreground grid place-items-center shrink-0">
                        <HeartHandshake className="size-5" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-base truncate">{m.name}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Leader: {leader?.fullName ?? "Unassigned"}
                        </p>
                      </div>
                    </div>
                    {canManage && (
                      <div className="flex gap-1 shrink-0">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(m)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => setConfirmDelete(m)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">{m.description}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Users className="size-4" /> Members
                    </span>
                    <Badge variant="secondary">{members.length}</Badge>
                  </div>
                  {members.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {members.slice(0, 6).map((mem) => (
                        <Badge key={mem.id} variant="outline" className="font-normal">
                          {mem.fullName}
                        </Badge>
                      ))}
                      {members.length > 6 && (
                        <Badge variant="outline" className="font-normal">
                          +{members.length - 6} more
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Ministry" : "New Ministry"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mname">Ministry Name *</Label>
              <Input
                id="mname"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="mdesc">Description *</Label>
              <Textarea
                id="mdesc"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
              {errors.description && (
                <p className="text-xs text-destructive">{errors.description}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Ministry Leader</Label>
              <Select
                value={form.leaderId}
                onValueChange={(v) => setForm({ ...form, leaderId: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Unassigned —</SelectItem>
                  {ministryLeaders.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{editing ? "Save Changes" : "Create"}</Button>
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
            <AlertDialogTitle>Delete this ministry?</AlertDialogTitle>
            <AlertDialogDescription>
              This will unassign all members from {confirmDelete?.name}.
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
