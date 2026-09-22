import type { LookupItem } from "@/components/form-fields"
import { $api } from "@/lib/api/client"
import { formatINR, humanize } from "@/lib/format"

// Item sources for LookupField / LookupCombobox — the /lookup endpoints from
// FRONTEND.md §4. Filters (client_id, project_id) narrow the cascade.

export function useClientLookup(search: string) {
  const { data, isLoading } = $api.useQuery("get", "/clients/lookup", {
    params: { query: { q: search || undefined, limit: 50 } },
  })
  const items: LookupItem[] = (data ?? []).map((c) => ({
    id: c.id,
    label: c.display_name,
    hint: c.gstin ?? undefined,
  }))
  return { items, isLoading }
}

export function useVendorLookup(search: string) {
  const { data, isLoading } = $api.useQuery("get", "/vendors/lookup", {
    params: { query: { q: search || undefined, limit: 50 } },
  })
  const items: LookupItem[] = (data ?? []).map((v) => ({
    id: v.id,
    label: v.vendor_name,
    hint: `TDS ${v.default_tds_slab_pct}%`,
  }))
  return { items, isLoading }
}

export function projectLookup(clientId?: number | null) {
  return function useProjectLookup(search: string) {
    const { data, isLoading } = $api.useQuery("get", "/projects/lookup", {
      params: { query: { q: search || undefined, client_id: clientId ?? undefined, limit: 50 } },
    })
    const items: LookupItem[] = (data ?? []).map((p) => ({
      id: p.id,
      label: p.project_name,
      hint: humanize(p.status),
    }))
    return { items, isLoading }
  }
}

export function poLookup(projectId?: number | null) {
  return function usePoLookup(search: string) {
    const { data, isLoading } = $api.useQuery(
      "get",
      "/pos/lookup",
      { params: { query: { project_id: projectId ?? undefined } } },
      { enabled: !!projectId }
    )
    const q = search.toLowerCase()
    const items: LookupItem[] = (data ?? [])
      .filter((po) => po.po_number.toLowerCase().includes(q))
      .map((po) => ({ id: po.id, label: po.po_number, hint: `${formatINR(po.po_value)} · ${humanize(po.status)}` }))
    return { items, isLoading: !!projectId && isLoading }
  }
}
