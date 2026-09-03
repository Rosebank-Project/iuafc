"use client"

import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"

const CHURCH_NAME = "The International United Apostolic Faith Church"

function header(doc: jsPDF, title: string) {
  doc.setFont("helvetica", "bold")
  doc.setFontSize(16)
  doc.setTextColor(20, 33, 61) // navy
  doc.text(CHURCH_NAME, 14, 18)
  doc.setFontSize(12)
  doc.setTextColor(80)
  doc.text(title, 14, 26)
  doc.setDrawColor(212, 175, 55) // gold
  doc.setLineWidth(0.6)
  doc.line(14, 30, 196, 30)
}

function footer(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(9)
    doc.setTextColor(120)
    doc.text(
      `Generated on ${new Date().toLocaleString()} • Page ${i} of ${pageCount}`,
      14,
      doc.internal.pageSize.getHeight() - 8,
    )
  }
}

export function exportTablePDF(opts: {
  title: string
  fileName: string
  head: string[][]
  body: (string | number)[][]
  meta?: string[]
}) {
  const doc = new jsPDF()
  header(doc, opts.title)
  let startY = 36
  if (opts.meta && opts.meta.length) {
    doc.setFontSize(10)
    doc.setTextColor(60)
    opts.meta.forEach((line, i) => doc.text(line, 14, startY + i * 5))
    startY += opts.meta.length * 5 + 2
  }
  autoTable(doc, {
    head: opts.head,
    body: opts.body,
    startY,
    theme: "striped",
    headStyles: { fillColor: [20, 33, 61], textColor: [255, 255, 255] },
    styles: { fontSize: 9 },
  })
  footer(doc)
  doc.save(opts.fileName)
}

export function exportReceiptPDF(opts: {
  receiptNumber: string
  memberName: string
  amount: number
  donationType: string
  paymentMethod: string
  date: string
  officerName: string
}) {
  const doc = new jsPDF({ unit: "mm", format: [148, 210] }) // A5
  doc.setFont("helvetica", "bold")
  doc.setFontSize(14)
  doc.setTextColor(20, 33, 61)
  doc.text(CHURCH_NAME, 74, 18, { align: "center" })
  doc.setFontSize(11)
  doc.setTextColor(120)
  doc.text("Donation Receipt", 74, 26, { align: "center" })

  doc.setDrawColor(212, 175, 55)
  doc.setLineWidth(0.6)
  doc.line(14, 30, 134, 30)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(40)

  const rows: [string, string][] = [
    ["Receipt No.", opts.receiptNumber],
    ["Date", opts.date],
    ["Received From", opts.memberName],
    ["Amount", `ZAR ${opts.amount.toLocaleString()}`],
    ["Donation Type", opts.donationType],
    ["Payment Method", opts.paymentMethod],
    ["Officer", opts.officerName],
  ]

  let y = 40
  rows.forEach(([label, val]) => {
    doc.setFont("helvetica", "bold")
    doc.text(label, 18, y)
    doc.setFont("helvetica", "normal")
    doc.text(String(val), 70, y)
    y += 8
  })

  doc.setDrawColor(220)
  doc.line(14, y + 4, 134, y + 4)
  doc.setFontSize(9)
  doc.setTextColor(120)
  doc.text("Thank you for your generous contribution. God bless you!", 74, y + 12, {
    align: "center",
  })

  doc.save(`receipt-${opts.receiptNumber}.pdf`)
}
