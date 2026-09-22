// Enum values from FRONTEND.md §8, as dropdown options.

export const PROJECT_STATUSES = [
  { value: "pipeline", label: "Pipeline" },
  { value: "booked", label: "Booked" },
  { value: "invoiced_partial", label: "Invoiced partial" },
  { value: "invoiced_full", label: "Invoiced full" },
  { value: "closed", label: "Closed" },
] as const
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]["value"]

export const PO_STATUSES = [
  { value: "open", label: "Open" },
  { value: "locked", label: "Locked" },
  { value: "closed", label: "Closed" },
] as const
export type PoStatus = (typeof PO_STATUSES)[number]["value"]

export const INVOICE_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "final", label: "Final" },
] as const
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]["value"]

export const PAYMENT_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "partially_paid", label: "Partially paid" },
  { value: "paid", label: "Paid" },
] as const
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]["value"]

export const VENDOR_CATEGORIES = [
  { value: "contractor", label: "Contractor" },
  { value: "professional", label: "Professional" },
] as const
export type VendorCategory = (typeof VENDOR_CATEGORIES)[number]["value"]

export const OVERHEAD_CATEGORIES = [
  { value: "admin", label: "Admin" },
  { value: "payroll", label: "Payroll" },
  { value: "generic_credit", label: "Generic credit" },
  { value: "other", label: "Other" },
] as const
export type OverheadCategory = (typeof OVERHEAD_CATEGORIES)[number]["value"]

export const CREDIT_TYPES = [
  { value: "project_specific", label: "Project-specific" },
  { value: "generic", label: "Generic" },
] as const
export type CreditType = (typeof CREDIT_TYPES)[number]["value"]

export const ALERT_TRANSITIONS = [
  { value: "initiated_no_po", label: "Initiated, no PO" },
  { value: "po_no_invoice", label: "PO, no invoice" },
  { value: "invoice_overdue", label: "Invoice overdue" },
] as const
export type AlertTransition = (typeof ALERT_TRANSITIONS)[number]["value"]

export const ROLES = [
  { value: "super_admin", label: "Super admin" },
  { value: "admin", label: "Admin (view-only)" },
  { value: "project_user", label: "Project user" },
] as const

export const ROLE_LABEL: Record<string, string> = Object.fromEntries(ROLES.map((r) => [r.value, r.label]))
export type RoleValue = (typeof ROLES)[number]["value"]

/** project.owning_bu — backend accepts only these (anything else → 422). */
export const BUSINESS_UNITS = [
  { value: "Content", label: "Content" },
  { value: "Tech", label: "Tech" },
] as const
export type BusinessUnit = (typeof BUSINESS_UNITS)[number]["value"]

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
].map((label, i) => ({ value: String(i + 1), label }))

/** Mutable copy for components that take `Option[]`. */
export function options<T extends readonly { value: string; label: string }[]>(list: T) {
  return list.map((o) => ({ value: o.value, label: o.label }))
}
