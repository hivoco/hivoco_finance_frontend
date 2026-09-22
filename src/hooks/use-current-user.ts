import { $api } from "@/lib/api/client"
import { useAuthStore } from "@/stores/auth"

/**
 * - super_admin: everything, incl. approvals, invoices, masters, locks, users, settings
 * - admin: view-only, company-wide (reports, audit, all projects); writes nothing
 * - project_user: edits own projects / POs / costs; no company reports
 */
export type Role = "super_admin" | "admin" | "project_user"

export function useCurrentUser() {
  const token = useAuthStore((s) => s.token)
  return $api.useQuery("get", "/auth/me", {}, {
    enabled: !!token,
    staleTime: 5 * 60_000,
  })
}

function useRole(): Role | undefined {
  return useCurrentUser().data?.role as Role | undefined
}

/** Approvals, invoices, masters, locks, users, settings — backend `require_super_admin`. */
export function useIsSuperAdmin() {
  return useRole() === "super_admin"
}

/** Company-wide views (dashboard, cash flow, vendor ledger, audit) — backend `require_view_all`. */
export function useCanViewAll() {
  const role = useRole()
  return role === "super_admin" || role === "admin"
}

/** Create/edit projects, POs, costs, credits, overhead — backend `require_editor` (blocks view-only admin). */
export function useCanEdit() {
  const role = useRole()
  return role === "super_admin" || role === "project_user"
}
