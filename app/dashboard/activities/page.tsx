"use client"

import { useMemo, useState } from "react"
import {
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  ListChecks,
  MapPin,
  Calendar as CalendarIcon,
} from "lucide-react"
import { useChurch } from "@/lib/church-context"
import type { ActivityStatus, MinistryActivity } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

interface ActivityForm {
  ministryId: string
  title: string
  description: string
  proposedDate: string
  venue: string
}

const emptyForm: ActivityForm = {
  ministryId: "",
  title: "",
  description: "",
  proposedDate: "",
  venue: "",
}

const STATUS_STYLE: Record<ActivityStatus, string> = {
  Pending: "bg-chart-4/20 text-chart-4 border-chart-4/40",
  Approved: "bg-chart-2/20 text-chart-2 border-chart-2/40",
  Rejected: "bg-destructive/15 text-destructive border-destructive/40",
}

const STATUS_ICON: Record<ActivityStatus, React.ComponentType<{ className?: string }>> = {
  Pending: Clock,
  Approved: CheckCircle2,
  Rejected: XCircle,
}

export default function ActivitiesPage() {
  const { data, currentUser, addActivity, reviewActivity, deleteActivity } = useChurch()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<ActivityForm>(emptyForm)
  const [errors, setErrors] = useState<Partial<Record<keyof ActivityForm, string>>>({})
  const [reviewing, setReviewing] = useState<{
    activity: MinistryActivity
    decision: "Approved" | "Rejected"
  } | null>(null)
  const [reviewNote, setReviewNote] = useState("")
  const [confirmDelete, setConfirmDelete] = useState<MinistryActivity | null>(null)

  if (!currentUser) return null

  const isLeader = currentUser.role === "Ministry Leader"
  const canReview =
    currentUser.role === "Administrator" || currentUser.role === "Pastor"

  const myMinistryId = currentUser.ministryId

  const visible = useMemo(() => {
    if (isLeader) {
      return data.activities.filter((a) => a.ministryId === myMinistryId)
    }
    return data.activities
  }, [data.activities, isLeader, myMinistryId])

  const grouped = useMemo(() => {
    const sorted = [...visible].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
    return {
      pending: sorted.filter((a) => a.status === "Pending"),
      approved: sorted.filter((a) => a.status === "Approved"),
      rejected: sorted.filter((a) => a.status === "Rejected"),
    }
  }, [visible])

  const openNew = () => {
    setForm({ ...emptyForm, ministryId: myMinistryId ?? "" })
    setErrors({})
    setOpen(true)
  }

  const validate = () => {
    const e: typeof errors = {}
    if (!form.ministryId) e.ministryId = "Required"
    if (!form.title.trim()) e.title = "Required"
    if (!form.description.trim()) e.description = "Required"
    if (!form.proposedDate) e.proposedDate = "Required"
    if (!form.venue.trim()) e.venue = "Required"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const save = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validate()) return
    addActivity({
      ministryId: form.ministryId,
      title: form.title.trim(),
      description: form.description.trim(),
      proposedDate: form.proposedDate,
      venue: form.venue.trim(),
      submittedById: currentUser.id,
    })
    toast.success("Activity submitted for pastor approval")
    setOpen(false)
  }

  const submitReview = () => {
    if (!reviewing) return
    reviewActivity(reviewing.activity.id, reviewing.decision, currentUser.id, reviewNote.trim() || undefined)
    toast.success(
      reviewing.decision === "Approved" ? "Activity approved" : "Activity rejected",
    )
    setReviewing(null)
    setReviewNote("")
  }

  const handleDelete = () => {
    if (!confirmDelete) return
    deleteActivity(confirmDelete.id)
    toast.success("Activity removed")
    setConfirmDelete(null)
  }

  const renderCard = (a: MinistryActivity) => {
    const ministry = data.ministries.find((m) => m.id === a.ministryId)
    const submitter = data.users.find((u) => u.id === a.submittedById)
    const reviewer = a.reviewedById
      ? data.users.find((u) => u.id === a.reviewedById)
      : null
    const Icon = STATUS_ICON[a.status]
    return (
      <Card key={a.id} className="overflow-hidden">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold">{a.title}</h3>
                <Badge variant="outline" className={STATUS_STYLE[a.status]}>
                  <Icon className="size-3 mr-1" /> {a.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {ministry?.name ?? "Unknown ministry"} • submitted by{" "}
                {submitter?.fullName ?? "—"} on{" "}
                {new Date(a.submittedAt).toLocaleDateString()}
              </p>
            </div>
            {(canReview || (isLeader && a.status === "Pending")) && (
              <Button
                size="icon"
                variant="ghost"
                className="text-destructive shrink-0"
                onClick={() => setConfirmDelete(a)}
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>

          <p className="text-sm text-muted-foreground">{a.description}</p>

          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarIcon className="size-3.5" />{" "}
              {new Date(a.proposedDate).toLocaleDateString()}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5" /> {a.venue}
            </span>
          </div>

          {a.reviewedAt && (
            <div className="rounded-md bg-secondary/60 border border-border p-3 text-sm space-y-1">
              <p className="text-xs text-muted-foreground">
                Reviewed by {reviewer?.fullName ?? "—"} on{" "}
                {new Date(a.reviewedAt).toLocaleDateString()}
              </p>
              {a.reviewNote && <p className="text-sm">{a.reviewNote}</p>}
            </div>
          )}

          {canReview && a.status === "Pending" && (
            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                onClick={() => {
                  setReviewing({ activity: a, decision: "Approved" })
                  setReviewNote("")
                }}
              >
                <CheckCircle2 className="size-3.5" /> Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setReviewing({ activity: a, decision: "Rejected" })
                  setReviewNote("")
                }}
              >
                <XCircle className="size-3.5" /> Reject
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Ministry Activities</h2>
          <p className="text-sm text-muted-foreground">
            {isLeader
              ? "Submit ministry activities for pastor approval."
              : "Review activities submitted by ministry leaders."}
          </p>
        </div>
        {isLeader && (
          <Button onClick={openNew} disabled={!myMinistryId}>
            <Plus className="size-4" /> Submit Activity
          </Button>
        )}
      </header>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({grouped.pending.length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({grouped.approved.length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({grouped.rejected.length})
          </TabsTrigger>
        </TabsList>
        {(["pending", "approved", "rejected"] as const).map((key) => (
          <TabsContent key={key} value={key} className="space-y-3 mt-4">
            {grouped[key].length === 0 ? (
              <Card>
                <CardContent className="p-10 text-center text-muted-foreground">
                  <ListChecks className="size-8 mx-auto mb-2 opacity-50" />
                  No {key} activities.
                </CardContent>
              </Card>
            ) : (
              grouped[key].map(renderCard)
            )}
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Ministry Activity</DialogTitle>
            <DialogDescription>
              Your pastor will review the activity before it&apos;s approved.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ministry">Ministry *</Label>
              <Select
                value={form.ministryId}
                onValueChange={(v) => setForm({ ...form, ministryId: v })}
                disabled={isLeader}
              >
                <SelectTrigger id="ministry">
                  <SelectValue placeholder="Select ministry" />
                </SelectTrigger>
                <SelectContent>
                  {data.ministries.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.ministryId && (
                <p className="text-xs text-destructive">{errors.ministryId}</p>
              )}
            </div>
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
              <Label htmlFor="adesc">Description *</Label>
              <Textarea
                id="adesc"
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
                <Label htmlFor="adate">Proposed Date *</Label>
                <Input
                  id="adate"
                  type="date"
                  value={form.proposedDate}
                  onChange={(e) => setForm({ ...form, proposedDate: e.target.value })}
                />
                {errors.proposedDate && (
                  <p className="text-xs text-destructive">{errors.proposedDate}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="avenue">Venue *</Label>
                <Input
                  id="avenue"
                  value={form.venue}
                  onChange={(e) => setForm({ ...form, venue: e.target.value })}
                />
                {errors.venue && <p className="text-xs text-destructive">{errors.venue}</p>}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Submit</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!reviewing} onOpenChange={(o) => !o && setReviewing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewing?.decision === "Approved" ? "Approve" : "Reject"} Activity
            </DialogTitle>
            <DialogDescription>{reviewing?.activity.title}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reviewNote">Review note (optional)</Label>
            <Textarea
              id="reviewNote"
              rows={3}
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder="Add comments for the ministry leader…"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewing(null)}>
              Cancel
            </Button>
            <Button onClick={submitReview}>
              Confirm {reviewing?.decision === "Approved" ? "Approval" : "Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this activity?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the activity from records.
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
