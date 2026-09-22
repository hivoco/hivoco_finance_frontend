import { format, parseISO } from "date-fns"

export { formatINR } from "@/lib/money"

/** "2026-08-01" → "01 Aug 2026". Empty → "—". */
export function formatDate(value?: string | null): string {
  return value ? format(parseISO(value), "dd MMM yyyy") : "—"
}

// Backend datetimes carry no offset and are IST (its MySQL session runs at
// +05:30), so pin the offset before parsing; the result shows in local time.
const HAS_OFFSET = /(Z|[+-]\d{2}:?\d{2})$/i

/** Backend datetime → "01 Aug 2026, 14:05" in the viewer's local time. */
export function formatDateTime(value?: string | null): string {
  if (!value) return "—"
  return format(parseISO(HAS_OFFSET.test(value) ? value : `${value}+05:30`), "dd MMM yyyy, HH:mm")
}

/** Date → API date string "yyyy-MM-dd". */
export function toApiDate(date: Date): string {
  return format(date, "yyyy-MM-dd")
}

const pluralRules = new Intl.PluralRules("en-IN")

/** 1 → "1 project", 3 → "3 projects". Pass `plural` for irregular words. */
export function countLabel(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${pluralRules.select(count) === "one" ? singular : plural}`
}

/** "invoiced_partial" → "Invoiced partial". */
export function humanize(value?: string | null): string {
  if (!value) return "—"
  const text = value.replaceAll("_", " ")
  return text.charAt(0).toUpperCase() + text.slice(1)
}
