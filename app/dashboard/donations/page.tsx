"use client"

import { useMemo, useState } from "react"
import { Plus, HandCoins, FileDown, Receipt, Trash2, TrendingUp } from "lucide-react"
import { useChurch } from "@/lib/church-context"
import type { Donation } from "@/lib/types"
import { exportReceiptPDF, exportTablePDF } from "@/lib/pdf"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { toast } from "sonner"

interface FormState {
  memberId: string
  amount: string
  donationType: "Tithe" | "Offering" | "Donation"
  paymentMethod: "Cash" | "Card" | "Transfer"
  donationDate: string
}

const today = () => new Date().toISOString().slice(0, 10)

const emptyForm: FormState = {
  memberId: "",
  amount: "",
  donationType: "Tithe",
  paymentMethod: "Cash",
  donationDate: today(),
}

export default function DonationsPage() {
  const { data, currentUser, addDonation, deleteDonation } = useChurch()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [confirmDelete, setConfirmDelete] = useState<Donation | null>(null)
  const [receiptDonation, setReceiptDonation] = useState<Donation | null>(null)

  // filters
  const [filterType, setFilterType] = useState<string>("all")
  const [filterMember, setFilterMember] = useState<string>("all")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")

  if (!currentUser) return null

  const canRecord =
    currentUser.role === "Finance Officer" || currentUser.role === "Administrator"
  const isMember = currentUser.role === "Church Member"

  const visibleDonations = useMemo(() => {
    let list = data.donations
    if (isMember && currentUser.memberId) {
      list = list.filter((d) => d.memberId === currentUser.memberId)
    }
    if (filterMember !== "all") list = list.filter((d) => d.memberId === filterMember)
    if (filterType !== "all") list = list.filter((d) => d.donationType === filterType)
    if (from) list = list.filter((d) => d.donationDate >= from)
    if (to) list = list.filter((d) => d.donationDate <= to)
    return [...list].sort((a, b) => b.donationDate.localeCompare(a.donationDate))
  }, [data.donations, currentUser, isMember, filterMember, filterType, from, to])

  const total = visibleDonations.reduce((s, d) => s + d.amount, 0)

  const validate = () => {
    const e: typeof errors = {}
    // must be linked to a registered member
    if (!form.memberId || !data.members.some((m) => m.id === form.memberId))
      e.memberId = "Select a registered member"
    // amount must be greater than zero
    if (!form.amount || Number(form.amount) <= 0) e.amount = "Amount must be greater than 0"
    // payment method must be selected
    if (!form.paymentMethod) e.paymentMethod = "Select a payment method"
    // date required and not in the future
    if (!form.donationDate) e.donationDate = "Required"
    else if (form.donationDate > today()) e.donationDate = "Date cannot be in the future"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validate()) return
    const newDon = addDonation({
      memberId: form.memberId,
      amount: Number(form.amount),
      donationType: form.donationType,
      paymentMethod: form.paymentMethod,
      donationDate: form.donationDate,
      financeOfficerId: currentUser.id,
    })
    toast.success("Donation recorded", { description: `Receipt ${newDon.receiptNumber}` })
    setOpen(false)
    setForm(emptyForm)
    setReceiptDonation(newDon) // show receipt dialog
  }

  const handleDelete = () => {
    if (!confirmDelete) return
    deleteDonation(confirmDelete.id)
    toast.success("Donation removed")
    setConfirmDelete(null)
  }

  const handlePrintReceipt = (d: Donation) => {
    const member = data.members.find((m) => m.id === d.memberId)
    const officer = data.users.find((u) => u.id === d.financeOfficerId)
    exportReceiptPDF({
      receiptNumber: d.receiptNumber,
      memberName: member?.fullName ?? "—",
      amount: d.amount,
      donationType: d.donationType,
      paymentMethod: d.paymentMethod,
      date: new Date(d.donationDate).toLocaleDateString(),
      officerName: officer?.fullName ?? "—",
    })
  }

  const handleExportSummary = () => {
    const head = [["Date", "Receipt", "Member", "Type", "Method", "Amount (ZAR)"]]
    const body = visibleDonations.map((d) => {
      const m = data.members.find((x) => x.id === d.memberId)
      return [
        new Date(d.donationDate).toLocaleDateString(),
        d.receiptNumber,
        m?.fullName ?? "—",
        d.donationType,
        d.paymentMethod,
        d.amount.toLocaleString(),
      ]
    })
    body.push(["", "", "", "", "TOTAL", total.toLocaleString()])
    const meta: string[] = []
    if (from || to) meta.push(`Period: ${from || "—"} to ${to || "—"}`)
    if (filterType !== "all") meta.push(`Type: ${filterType}`)
    if (filterMember !== "all") {
      const m = data.members.find((x) => x.id === filterMember)
      meta.push(`Member: ${m?.fullName ?? "—"}`)
    }
    meta.push(`Total amount: ZAR ${total.toLocaleString()}`)
    exportTablePDF({
      title: "Financial Summary Report",
      fileName: `financial-summary-${Date.now()}.pdf`,
      head,
      body,
      meta,
    })
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Donations</h2>
          <p className="text-sm text-muted-foreground">
            {isMember
              ? "Your giving history and receipts."
              : "Record donations and generate financial reports."}
          </p>
        </div>
        {canRecord && (
          <Button
            onClick={() => {
              setForm(emptyForm)
              setErrors({})
              setOpen(true)
            }}
          >
            <Plus className="size-4" /> Record Donation
          </Button>
        )}
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Total</p>
            <p className="text-2xl font-semibold mt-1">ZAR {total.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">{visibleDonations.length} records</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Tithes</p>
            <p className="text-2xl font-semibold mt-1">
              {"ZAR "}
              {visibleDonations
                .filter((d) => d.donationType === "Tithe")
                .reduce((s, d) => s + d.amount, 0)
                .toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Offerings</p>
            <p className="text-2xl font-semibold mt-1">
              {"ZAR "}
              {visibleDonations
                .filter((d) => d.donationType === "Offering")
                .reduce((s, d) => s + d.amount, 0)
                .toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Donations</TabsTrigger>
          {!isMember && <TabsTrigger value="filters">Filters & Export</TabsTrigger>}
        </TabsList>
        <TabsContent value="all" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <HandCoins className="size-4 text-primary" /> History
              </CardTitle>
              {!isMember && (
                <Button variant="outline" size="sm" onClick={handleExportSummary}>
                  <FileDown className="size-4" /> Export
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Receipt</TableHead>
                      <TableHead>Member</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="hidden sm:table-cell">Method</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleDonations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                          No donations found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      visibleDonations.map((d) => {
                        const m = data.members.find((x) => x.id === d.memberId)
                        return (
                          <TableRow key={d.id}>
                            <TableCell className="text-sm">
                              {new Date(d.donationDate).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {d.receiptNumber}
                            </TableCell>
                            <TableCell className="font-medium">
                              {m?.fullName ?? "—"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{d.donationType}</Badge>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                              {d.paymentMethod}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {"ZAR "}{d.amount.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handlePrintReceipt(d)}
                                  aria-label="Print receipt"
                                >
                                  <Receipt className="size-4" />
                                </Button>
                                {canRecord && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => setConfirmDelete(d)}
                                    className="text-destructive"
                                    aria-label="Delete"
                                  >
                                    <Trash2 className="size-4" />
                                  </Button>
                                )}
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
        </TabsContent>

        {!isMember && (
          <TabsContent value="filters" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="size-4 text-primary" /> Generate Financial Report
                </CardTitle>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      <SelectItem value="Tithe">Tithe</SelectItem>
                      <SelectItem value="Offering">Offering</SelectItem>
                      <SelectItem value="Donation">Donation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Member</Label>
                  <Select value={filterMember} onValueChange={setFilterMember}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All members</SelectItem>
                      {data.members.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>From</Label>
                  <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>To</Label>
                  <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                </div>
                <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
                  <Button onClick={handleExportSummary} disabled={visibleDonations.length === 0}>
                    <FileDown className="size-4" /> Export PDF Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Add donation dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Donation</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label>Member *</Label>
              <Select
                value={form.memberId}
                onValueChange={(v) => setForm({ ...form, memberId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select member" />
                </SelectTrigger>
                <SelectContent>
                  {data.members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.memberId && <p className="text-xs text-destructive">{errors.memberId}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="amt">Amount (ZAR) *</Label>
                <Input
                  id="amt"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
                {errors.amount && <p className="text-xs text-destructive">{errors.amount}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="ddate">Date *</Label>
                <Input
                  id="ddate"
                  type="date"
                  max={today()}
                  value={form.donationDate}
                  onChange={(e) => setForm({ ...form, donationDate: e.target.value })}
                />
                {errors.donationDate && (
                  <p className="text-xs text-destructive">{errors.donationDate}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Type *</Label>
                <Select
                  value={form.donationType}
                  onValueChange={(v) => setForm({ ...form, donationType: v as FormState["donationType"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Tithe">Tithe</SelectItem>
                    <SelectItem value="Offering">Offering</SelectItem>
                    <SelectItem value="Donation">Donation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Method *</Label>
                <Select
                  value={form.paymentMethod}
                  onValueChange={(v) =>
                    setForm({ ...form, paymentMethod: v as FormState["paymentMethod"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Card">Card</SelectItem>
                    <SelectItem value="Transfer">Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Record</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Receipt dialog */}
      <Dialog open={!!receiptDonation} onOpenChange={(o) => !o && setReceiptDonation(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="size-4 text-primary" /> Donation Receipt
            </DialogTitle>
          </DialogHeader>
          {receiptDonation && (
            <div className="border border-border rounded-lg p-5 space-y-3 bg-secondary/30">
              <div className="text-center pb-3 border-b border-border">
                <p className="text-xs uppercase tracking-widest text-accent font-semibold">IUAFC</p>
                <p className="font-semibold">
                  The International United Apostolic Faith Church
                </p>
                <p className="text-xs text-muted-foreground">Donation Receipt</p>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Receipt No.</dt>
                <dd className="font-mono">{receiptDonation.receiptNumber}</dd>
                <dt className="text-muted-foreground">Date</dt>
                <dd>{new Date(receiptDonation.donationDate).toLocaleDateString()}</dd>
                <dt className="text-muted-foreground">Member</dt>
                <dd>
                  {data.members.find((m) => m.id === receiptDonation.memberId)?.fullName ?? "—"}
                </dd>
                <dt className="text-muted-foreground">Type</dt>
                <dd>{receiptDonation.donationType}</dd>
                <dt className="text-muted-foreground">Method</dt>
                <dd>{receiptDonation.paymentMethod}</dd>
                <dt className="text-muted-foreground">Amount</dt>
                <dd className="font-semibold">{"ZAR "}{receiptDonation.amount.toLocaleString()}</dd>
              </dl>
              <p className="text-xs text-center text-muted-foreground pt-3 border-t border-border">
                Thank you for your generous contribution. God bless you!
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiptDonation(null)}>
              Close
            </Button>
            <Button onClick={() => receiptDonation && handlePrintReceipt(receiptDonation)}>
              <FileDown className="size-4" /> Download PDF
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
            <AlertDialogTitle>Delete this donation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove receipt {confirmDelete?.receiptNumber}.
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
