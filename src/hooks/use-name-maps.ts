import { useQuery } from "@tanstack/react-query"

import { useIsSuperAdmin } from "@/hooks/use-current-user"
import { fetchClient } from "@/lib/api/client"

// The API returns ids only (client_id, vendor_id, signed_by…). These hooks load
// every page of the list endpoint (the API caps page size) and resolve id → name.
const STALE = 5 * 60_000
const MAX_PAGES = 50 // safety net if an endpoint ever ignores `offset`

type Page<T> = { data?: T[]; error?: unknown }

async function fetchAllPages<T>(pageSize: number, getPage: (offset: number) => Promise<Page<T>>): Promise<T[]> {
  const rows: T[] = []
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await getPage(page * pageSize)
    if (error) throw error
    rows.push(...(data ?? []))
    if (!data || data.length < pageSize) break
  }
  return rows
}

// `select` functions live at module scope so TanStack Query builds each Map once
// per response instead of on every render.
const byName =
  <T extends { id: number }>(name: (row: T) => string) =>
  (rows: T[]) =>
    new Map(rows.map((row) => [row.id, name(row)]))

const clientMap = byName<{ id: number; display_name: string }>((c) => c.display_name)
const vendorMap = byName<{ id: number; vendor_name: string }>((v) => v.vendor_name)
const projectMap = byName<{ id: number; project_name: string }>((p) => p.project_name)
const poMap = byName<{ id: number; po_number: string }>((p) => p.po_number)
const userMap = byName<{ id: number; name: string }>((u) => u.name)

function resolver(map: Map<number, string> | undefined, label: string) {
  return (id?: number | null) => (id ? (map?.get(id) ?? `${label} #${id}`) : "—")
}

export function useClientNames() {
  const { data } = useQuery({
    queryKey: ["names", "/clients"],
    queryFn: () => fetchAllPages(200, (offset) => fetchClient.GET("/clients", { params: { query: { limit: 200, offset } } })),
    select: clientMap,
    staleTime: STALE,
  })
  return resolver(data, "Client")
}

export function useVendorNames() {
  const { data } = useQuery({
    queryKey: ["names", "/vendors"],
    queryFn: () => fetchAllPages(200, (offset) => fetchClient.GET("/vendors", { params: { query: { limit: 200, offset } } })),
    select: vendorMap,
    staleTime: STALE,
  })
  return resolver(data, "Vendor")
}

export function useProjectNames() {
  const { data } = useQuery({
    queryKey: ["names", "/projects"],
    queryFn: () => fetchAllPages(200, (offset) => fetchClient.GET("/projects", { params: { query: { limit: 200, offset } } })),
    select: projectMap,
    staleTime: STALE,
  })
  return resolver(data, "Project")
}

export function usePoNumbers() {
  const { data } = useQuery({
    queryKey: ["names", "/pos"],
    queryFn: () => fetchAllPages(200, (offset) => fetchClient.GET("/pos", { params: { query: { limit: 200, offset } } })),
    select: poMap,
    staleTime: STALE,
  })
  return resolver(data, "PO")
}

/** /users is super_admin-only; project users see "User #id". */
export function useUserNames() {
  const isSuperAdmin = useIsSuperAdmin()
  const { data } = useQuery({
    queryKey: ["names", "/users"],
    queryFn: () => fetchAllPages(500, (offset) => fetchClient.GET("/users", { params: { query: { limit: 500, offset } } })),
    select: userMap,
    staleTime: STALE,
    enabled: isSuperAdmin,
  })
  return resolver(data, "User")
}
