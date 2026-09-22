import { Badge } from "@/components/ui/badge"
import { humanize } from "@/lib/format"

// Enum values from FRONTEND.md §8 → badge style.
const VARIANT: Record<string, React.ComponentProps<typeof Badge>["variant"]> = {
  // project.status
  pipeline: "outline",
  booked: "secondary",
  invoiced_partial: "secondary",
  invoiced_full: "default",
  closed: "outline",
  // po.status
  open: "outline",
  locked: "default",
  // invoice.status
  draft: "outline",
  final: "default",
  // payment_status
  pending: "outline",
  partially_paid: "secondary",
  paid: "default",
}

export function StatusBadge({ value }: { value?: string | null }) {
  if (!value) return <span className="text-muted-foreground">—</span>
  return <Badge variant={VARIANT[value] ?? "outline"}>{humanize(value)}</Badge>
}

export function BoolBadge({ value, yes, no }: { value: boolean; yes: string; no: string }) {
  return <Badge variant={value ? "default" : "outline"}>{value ? yes : no}</Badge>
}
