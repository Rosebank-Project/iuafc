"use client"

import { useMemo, useState } from "react"
import {
  Plus,
  Pencil,
  Trash2,
  ShieldAlert,
  Search,
  KeyRound,
  UserCog,
} from "lucide-react"
import { useChurch } from "@/lib/church-context"
import type { Role, User } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "sonner"

const ROLES: Role[] = [
  "Administrator",
  "Pastor",
  "Finance Officer",
  "Ministry Leader",
  "Church Member",
]

const ROLE_BADGE: Record<Role, string> = {
  Administrator: "bg-primary text-primary-foreground",
  Pastor: "bg-accent text-accent-foreground",
  "Finance Officer": "bg-chart-2 text-primary-foreground",
  "Ministry Leader": "bg-chart-3 text-primary-foreground",
  "Church Member": "bg-secondary text-secondary-foreground",
}

interface UserForm {
  fullName: string
  username: string
  password: string
  role: Role
  memberId: string
  ministryId: string
}

const emptyForm: UserForm = {
  fullName: "",
  username: "",
  password: "",
  role: "Church Member",
  memberId: "",
  ministryId: "",
}

export default function UsersPage() {
  const { data, currentUser, addUser, updateUser, deleteUser } = useChurch()
  const [query, setQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [form, setForm] = useState<UserForm>(emptyForm)
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  if (!currentUser) return null

  if (currentUser.role !== "Administrator") {
    return (
      <Alert variant="destructive">
        <ShieldAlert className="size-4" />
        <AlertDescription>
          Only Administrators can manage user accounts.
        </AlertDescription>
      </Alert>
    )
  }

  const filtered = useMemo(() => {
    let list = data.users
    if (roleFilter !== "all") list = list.filter((u) => u.role === roleFilter)
    const q = query.trim().toLowerCase()
    if (q)
      list = list.filter(
        (u) =>
          u.fullName.toLowerCase().includes(q) ||
          u.username.toLowerCase().includes(q) ||
          u.role.toLowerCase().includes(q),
      )
    return [...list].sort((a, b) => a.fullName.localeCompare(b.fullName))
  }, [data.users, query, roleFilter])

  const openNew = () => {
    setEditing(null)
    setForm(emptyForm)
    setFormError(null)
    setOpen(true)
  }

  const openEdit = (u: User) => {
    setEditing(u)
    setForm({
      fullName: u.fullName,
      username: u.username,
      password: "",
      role: u.role,
      memberId: u.memberId ?? "",
      ministryId: u.ministryId ?? "",
    })
    setFormError(null)
    setOpen(true)
  }

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (!form.fullName.trim()) return setFormError("Full name is required.")
    if (!form.username.trim()) return setFormError("Username is required.")

    const payload = {
      fullName: form.fullName,
      username: form.username,
      role: form.role,
      memberId: form.role === "Church Member" ? form.memberId || undefined : undefined,
      ministryId:
        form.role === "Ministry Leader" ? form.ministryId || undefined : undefined,
    }

    if (editing) {
      const res = updateUser(editing.id, {
        ...payload,
        password: form.password ? form.password : undefined,
      })
      if (!res.success) return setFormError(res.error ?? "Failed to update account.")
      toast.success("Account updated")
    } else {
      if (!form.password.trim())
        return setFormError("Password is required for new accounts.")
      const res = addUser({ ...payload, password: form.password })
      if (!res.success) return setFormError(res.error ?? "Failed to create account.")
      toast.success("Account created")
    }
    setOpen(false)
  }

  const handleDelete = () => {
    if (!confirmDelete) return
    const res = deleteUser(confirmDelete.id)
    if (!res.success) {
      toast.error(res.error ?? "Failed to delete account")
    } else {
      toast.success("Account deleted")
    }
    setConfirmDelete(null)
  }

  const generatePassword = () => {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"
    let p = ""
    for (let i = 0; i < 10; i++) p += chars[Math.floor(Math.random() * chars.length)]
    setForm((f) => ({ ...f, password: p }))
  }

  const roleCounts = useMemo(() => {
    const c: Record<Role, number> = {
      Administrator: 0,
      Pastor: 0,
      "Finance Officer": 0,
      "Ministry Leader": 0,
      "Church Member": 0,
    }
    for (const u of data.users) c[u.role]++
    return c
  }, [data.users])

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">User Accounts</h2>
          <p className="text-sm text-muted-foreground">
            Create and manage login accounts for every role in the church.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="size-4" /> New Account
        </Button>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {ROLES.map((r) => (
          <Card key={r}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                {r}
              </p>
              <p className="text-xl font-semibold mt-1">{roleCounts[r]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
                placeholder="Search by name, username or role"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="sm:w-56">
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Linked</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-10 text-muted-foreground"
                    >
                      <UserCog className="size-8 mx-auto mb-2 opacity-50" />
                      No accounts match your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((u) => {
                    const isSelf = u.id === currentUser.id
                    const linkedMember = u.memberId
                      ? data.members.find((m) => m.id === u.memberId)?.fullName
                      : null
                    const linkedMinistry = u.ministryId
                      ? data.ministries.find((m) => m.id === u.ministryId)?.name
                      : null
                    return (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">
                          {u.fullName}
                          {isSelf && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              you
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{u.username}</TableCell>
                        <TableCell>
                          <Badge className={ROLE_BADGE[u.role]}>{u.role}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {linkedMember && <span>Member: {linkedMember}</span>}
                          {linkedMinistry && <span>Ministry: {linkedMinistry}</span>}
                          {!linkedMember && !linkedMinistry && <span>—</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => openEdit(u)}>
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive"
                              disabled={isSelf}
                              onClick={() => setConfirmDelete(u)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Account" : "Create New Account"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Update account information. Leave the password blank to keep it unchanged."
                : "Choose a role and create a new login account."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  value={form.username}
                  onChange={(e) =>
                    setForm({ ...form, username: e.target.value.replace(/\s+/g, "") })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) => setForm({ ...form, role: v as Role })}
                >
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {form.role === "Church Member" && (
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="memberId">Link to Member Record</Label>
                  <Select
                    value={form.memberId || "none"}
                    onValueChange={(v) =>
                      setForm({ ...form, memberId: v === "none" ? "" : v })
                    }
                  >
                    <SelectTrigger id="memberId">
                      <SelectValue placeholder="Select a member" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {data.members.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Linking enables the member to view their own attendance and donations.
                  </p>
                </div>
              )}

              {form.role === "Ministry Leader" && (
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="ministryId">Assigned Ministry</Label>
                  <Select
                    value={form.ministryId || "none"}
                    onValueChange={(v) =>
                      setForm({ ...form, ministryId: v === "none" ? "" : v })
                    }
                  >
                    <SelectTrigger id="ministryId">
                      <SelectValue placeholder="Select ministry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {data.ministries.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2 col-span-2">
                <Label htmlFor="password">
                  Password {editing ? "(leave blank to keep)" : "*"}
                </Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="text"
                      className="pl-9 font-mono"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder={editing ? "Unchanged" : "At least 4 characters"}
                    />
                  </div>
                  <Button type="button" variant="outline" onClick={generatePassword}>
                    Generate
                  </Button>
                </div>
              </div>
            </div>

            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{editing ? "Save" : "Create Account"}</Button>
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
            <AlertDialogTitle>Delete this account?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.fullName} will no longer be able to sign in. This action cannot be
              undone.
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
