import { Link } from "react-router"

import { humanize } from "@/lib/format"

// entity_type values written by the backend (alerts + audit log) → detail route.
const ROUTES: Record<string, string> = {
  project: "/projects",
  purchase_order: "/pos",
  client_invoice: "/invoices",
  external_cost: "/costs",
}

export function EntityLink({ type, id }: { type: string; id?: number | null }) {
  const label = `${humanize(type)}${id ? ` #${id}` : ""}`
  const base = ROUTES[type]
  if (!base || !id) return <span>{label}</span>
  return (
    <Link to={`${base}/${id}`} className="underline-offset-4 hover:underline">
      {label}
    </Link>
  )
}
