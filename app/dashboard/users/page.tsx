"use client"

import { useEffect, useMemo, useState } from "react"
import { Info, Loader2, Pencil, RefreshCw, Search, UserCog } from "lucide-react"
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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Spinner } from "@/components/ui/spinner"
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

/**
 * User accounts and roles (Administrator only). Accounts are created by Supabase Auth
 * when people register or sign in with Google; roles change through the
 * `set_user_role` database function, which keeps at least one Administrator.
 */
export default function UsersPage() {
  const { currentUser, profiles, loadProfiles, setUserRole } = useChurch()
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [editing, setEditing] = useState<User | null>(null)
  const [newRole, setNewRole] = useState<Role>("Church Member")
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const refresh = async () => {
    setLoading(true)
    const result = await loadProfiles()
    setLoadError(result.success ? null : result.error ?? "Could not load users.")
    setLoading(false)
  }

  useEffect(() => {
    if (currentUser?.role === "Administrator") refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.role])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return profiles
      .filter((u) => roleFilter === "all" || u.role === roleFilter)
      .filter(
        (u) =>
          !q ||
          u.fullName.toLowerCase().includes(q) ||
          u.username.toLowerCase().includes(q) ||
          u.role.toLowerCase().includes(q),
      )
  }, [profiles, query, roleFilter])

  const roleCounts = useMemo(() => {
    const c = Object.fromEntries(ROLES.map((r) => [r, 0])) as Record<Role, number>
    for (const u of profiles) c[u.role]++
    return c
  }, [profiles])

  if (!currentUser) return null
  if (currentUser.role !== "Administrator") {
    return (
      <Alert>
        <AlertDescription>Only Administrators can manage user accounts.</AlertDescription>
      </Alert>
    )
  }

  const openEdit = (u: User) => {
    setEditing(u)
    setNewRole(u.role)
    setSaveError(null)
  }

  const handleSave = async () => {
    if (!editing || saving) return
    setSaving(true)
    const result = await setUserRole(editing.id, newRole)
    setSaving(false)
    if (result.success) {
      toast.success(`${editing.fullName} is now ${newRole}`)
      setEditing(null)
    } else {
      setSaveError(result.error ?? "Could not change the role.")
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">User Accounts</h2>
          <p className="text-sm text-muted-foreground">
            Manage the role of every account in the church.
          </p>
        </div>
        <Button variant="outline" onClick={refresh} disabled={loading}>
          <RefreshCw className="size-4" /> Refresh
        </Button>
      </header>

      <Alert>
        <Info className="size-4" />
        <AlertDescription>
          Accounts are created when people register or sign in with Google (on the website or the
          mobile app). New accounts start as Church Member.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {ROLES.map((r) => (
          <Card key={r}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{r}</p>
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
                placeholder="Search by name, email or role"
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

          {loadError && (
            <Alert variant="destructive">
              <AlertDescription>{loadError}</AlertDescription>
            </Alert>
          )}

          <div className="rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10">
                      <Spinner className="size-6 mx-auto text-primary" />
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                      <UserCog className="size-8 mx-auto mb-2 opacity-50" />
                      No accounts match your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">
                        {u.fullName}
                        {u.id === currentUser.id && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            you
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">{u.username}</TableCell>
                      <TableCell>
                        <Badge className={ROLE_BADGE[u.role]}>{u.role}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(u)}>
                          <Pencil className="size-4" /> Change role
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(open) => !open && !saving && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change role</DialogTitle>
            <DialogDescription>{editing?.fullName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={newRole} onValueChange={(v) => setNewRole(v as Role)}>
              <SelectTrigger id="role" className="w-full">
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
          {saveError && (
            <Alert variant="destructive">
              <AlertDescription>{saveError}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || newRole === editing?.role}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : null} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
