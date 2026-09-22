import { createBrowserRouter, type RouteObject } from "react-router"

import { AppLayout } from "@/components/layout/app-layout"
import { RequireRole } from "@/components/require-role"
import type { Role } from "@/hooks/use-current-user"
import { LoginPage } from "@/pages/login"
import { NotFoundPage } from "@/pages/not-found"

// Pages load on demand (React Router `lazy`) so the first load stays small.
// `handle.title` feeds the site header.
function page<K extends string>(
  load: () => Promise<Record<K, React.FC>>,
  name: K,
  options: { roles?: Role[] } = {}
): Pick<RouteObject, "lazy"> {
  return {
    lazy: async () => {
      const Page: React.FC = (await load())[name]
      return {
        Component: options.roles
          ? () => (
              <RequireRole roles={options.roles!}>
                <Page />
              </RequireRole>
            )
          : Page,
      }
    },
  }
}

// Company-wide screens (backend require_view_all).
const VIEW_ALL: Role[] = ["super_admin", "admin"]

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    element: <AppLayout />,
    children: [
      { index: true, handle: { title: "Dashboard" }, ...page(() => import("@/pages/home"), "HomePage") },
      {
        path: "cashflow",
        handle: { title: "Cash flow" },
        ...page(() => import("@/pages/cashflow"), "CashflowPage", { roles: VIEW_ALL }),
      },
      { path: "alerts", handle: { title: "SLA alerts" }, ...page(() => import("@/pages/alerts"), "AlertsPage") },

      { path: "projects", handle: { title: "Projects" }, ...page(() => import("@/pages/projects"), "ProjectsPage") },
      {
        path: "projects/:id",
        handle: { title: "Project" },
        ...page(() => import("@/pages/project-detail"), "ProjectDetailPage"),
      },
      { path: "pos", handle: { title: "Purchase orders" }, ...page(() => import("@/pages/pos"), "PurchaseOrdersPage") },
      { path: "pos/:id", handle: { title: "Purchase order" }, ...page(() => import("@/pages/po-detail"), "PoDetailPage") },
      { path: "invoices", handle: { title: "Invoices" }, ...page(() => import("@/pages/invoices"), "InvoicesPage") },
      {
        path: "invoices/:id",
        handle: { title: "Invoice" },
        ...page(() => import("@/pages/invoice-detail"), "InvoiceDetailPage"),
      },
      { path: "clients", handle: { title: "Clients" }, ...page(() => import("@/pages/clients"), "ClientsPage") },

      { path: "costs", handle: { title: "External costs" }, ...page(() => import("@/pages/costs"), "CostsPage") },
      { path: "costs/:id", handle: { title: "External cost" }, ...page(() => import("@/pages/cost-detail"), "CostDetailPage") },
      { path: "vendors", handle: { title: "Vendors" }, ...page(() => import("@/pages/vendors"), "VendorsPage") },
      {
        path: "vendor-ledger",
        handle: { title: "Vendor ledger" },
        ...page(() => import("@/pages/vendor-ledger"), "VendorLedgerPage", { roles: VIEW_ALL }),
      },
      { path: "credits", handle: { title: "Credits" }, ...page(() => import("@/pages/credits"), "CreditsPage") },
      { path: "overhead", handle: { title: "Overhead" }, ...page(() => import("@/pages/overhead"), "OverheadPage") },

      { path: "locks", handle: { title: "Month locks" }, ...page(() => import("@/pages/locks"), "LocksPage") },
      {
        path: "audit",
        handle: { title: "Audit log" },
        ...page(() => import("@/pages/audit"), "AuditPage", { roles: VIEW_ALL }),
      },
      {
        path: "users",
        handle: { title: "Users" },
        ...page(() => import("@/pages/users"), "UsersPage", { roles: ["super_admin"] }),
      },
      { path: "settings", handle: { title: "Settings" }, ...page(() => import("@/pages/settings"), "SettingsPage") },

      { path: "*", element: <NotFoundPage />, handle: { title: "Not found" } },
    ],
  },
])
