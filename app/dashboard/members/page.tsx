"use client"

import { useMemo, useState } from "react"
import { Plus, Search, Pencil, Trash2, Users } from "lucide-react"
import { useChurch } from "@/lib/church-context"
import type { Member } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

type SortKey = "fullName" | "joinDate" | "ministryId"

interface FormState {
  fullName: string
  gender: "Male" | "Female"
  dateOfBirth: string
  contactNumber: string
  email: string
  address: string
  ministryId: string
  joinDate: string
}

const emptyForm: FormState = {
  fullName: "",
  gender: "Male",
  dateOfBirth: "",
  contactNumber: "",
  email: "",
  address: "",
  ministryId: "none",
  joinDate: new Date().toISOString().slice(0, 10),
}

export default function MembersPage() {
  const { data, currentUser, addMember, updateMember, deleteMember } = useChurch()
  const [search, setSearch] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("fullName")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Member | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [confirmDelete, setConfirmDelete] = useState<Member | null>(null)

  if (!currentUser) return null

  const canManage = currentUser.role === "Administrator"

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = data.members
    if (q) {
      list = list.filter(
        (m) =>
          m.fullName.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          m.contactNumber.toLowerCase().includes(q),
      )
    }
    return [...list].sort((a, b) => {
      if (sortKey === "fullName") return a.fullName.localeCompare(b.fullName)
      if (sortKey === "joinDate") return b.joinDate.localeCompare(a.joinDate)
      return (a.ministryId ?? "").localeCompare(b.ministryId ?? "")
    })
  }, [data.members, search, sortKey])

  const openNew = () => {
    setEditing(null)
    setForm(emptyForm)
    setErrors({})
    setDialogOpen(true)
  }

  const openEdit = (m: Member) => {
    setEditing(m)
    setForm({
      fullName: m.fullName,
      gender: m.gender,
      dateOfBirth: m.dateOfBirth,
      contactNumber: m.contactNumber,
      email: m.email,
      address: m.address,
      ministryId: m.ministryId ?? "none",
      joinDate: m.joinDate,
    })
    setErrors({})
    setDialogOpen(true)
  }

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormState, string>> = {}
    const today = new Date().toISOString().slice(0, 10)

    if (!form.fullName.trim()) e.fullName = "Full name is required"
    if (!form.dateOfBirth) e.dateOfBirth = "Date of birth is required"

    // Contact number: required and numeric characters only
    if (!form.contactNumber.trim()) e.contactNumber = "Contact number is required"
    else if (!/^[0-9+\s-]*[0-9][0-9+\s-]*$/.test(form.contactNumber.trim()))
      e.contactNumber = "Contact number must contain digits only"

    // Email: required, valid format, and unique
    if (!form.email.trim()) e.email = "Email is required"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Enter a valid email address"
    else {
      const emailTaken = data.members.some(
        (m) => m.id !== editing?.id && m.email.toLowerCase() === form.email.trim().toLowerCase(),
      )
      if (emailTaken) e.email = "This email is already registered to another member"
    }

    if (!form.address.trim()) e.address = "Address is required"

    // Join date: required and not in the future
    if (!form.joinDate) e.joinDate = "Join date is required"
    else if (form.joinDate > today) e.joinDate = "Join date cannot be in the future"

    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validate()) return
    const payload = {
      ...form,
      ministryId: form.ministryId === "none" ? undefined : form.ministryId,
    }
    if (editing) {
      updateMember(editing.id, payload)
      toast.success("Member updated")
    } else {
      addMember(payload)
      toast.success("Member added")
    }
    setDialogOpen(false)
  }

  const handleDelete = () => {
    if (!confirmDelete) return
    deleteMember(confirmDelete.id)
    toast.success(`${confirmDelete.fullName} removed`)
    setConfirmDelete(null)
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Members</h2>
          <p className="text-sm text-muted-foreground">
            Manage church member records and ministry assignments.
          </p>
        </div>
        {canManage && (
          <Button onClick={openNew}>
            <Plus className="size-4" /> Add Member
          </Button>
        )}
      </header>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-4 text-primary" /> All Members ({filtered.length})
          </CardTitle>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search name, email, phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 sm:w-72"
              />
            </div>
            <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
              <SelectTrigger className="sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fullName">Sort: Name</SelectItem>
                <SelectItem value="joinDate">Sort: Join Date</SelectItem>
                <SelectItem value="ministryId">Sort: Ministry</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead className="hidden lg:table-cell">Ministry</TableHead>
                  <TableHead className="hidden md:table-cell">Joined</TableHead>
                  {canManage && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canManage ? 7 : 6} className="text-center text-muted-foreground py-10">
                      No members found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((m) => {
                    const ministry = data.ministries.find((x) => x.id === m.ministryId)
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.fullName}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{m.gender}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{m.contactNumber}</TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {m.email}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {ministry ? (
                            <Badge variant="outline">{ministry.name}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground text-xs">
                          {new Date(m.joinDate).toLocaleDateString()}
                        </TableCell>
                        {canManage && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => openEdit(m)}
                                aria-label="Edit"
                              >
                                <Pencil className="size-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setConfirmDelete(m)}
                                aria-label="Delete"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Member" : "Add New Member"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update member details" : "Register a new church member"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                />
                {errors.fullName && (
                  <p className="text-xs text-destructive">{errors.fullName}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Gender *</Label>
                <Select
                  value={form.gender}
                  onValueChange={(v) => setForm({ ...form, gender: v as "Male" | "Female" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dob">Date of Birth *</Label>
                <Input
                  id="dob"
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                />
                {errors.dateOfBirth && (
                  <p className="text-xs text-destructive">{errors.dateOfBirth}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Contact Number *</Label>
                <Input
                  id="phone"
                  inputMode="tel"
                  value={form.contactNumber}
                  onChange={(e) => setForm({ ...form, contactNumber: e.target.value })}
                />
                {errors.contactNumber && (
                  <p className="text-xs text-destructive">{errors.contactNumber}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address">Home Address *</Label>
                <Input
                  id="address"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
                {errors.address && <p className="text-xs text-destructive">{errors.address}</p>}
              </div>
              <div className="space-y-2">
                <Label>Ministry</Label>
                <Select
                  value={form.ministryId}
                  onValueChange={(v) => setForm({ ...form, ministryId: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Unassigned —</SelectItem>
                    {data.ministries.map((min) => (
                      <SelectItem key={min.id} value={min.id}>
                        {min.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="join">Join Date *</Label>
                <Input
                  id="join"
                  type="date"
                  max={new Date().toISOString().slice(0, 10)}
                  value={form.joinDate}
                  onChange={(e) => setForm({ ...form, joinDate: e.target.value })}
                />
                {errors.joinDate && (
                  <p className="text-xs text-destructive">{errors.joinDate}</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{editing ? "Save Changes" : "Add Member"}</Button>
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
            <AlertDialogTitle>Delete this member?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {confirmDelete?.fullName} along with all related attendance and
              donation records. This action cannot be undone.
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
