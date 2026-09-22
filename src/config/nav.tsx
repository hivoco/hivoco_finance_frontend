import {
  BanknoteIcon,
  BookOpenIcon,
  BellIcon,
  BuildingIcon,
  FileTextIcon,
  FolderKanbanIcon,
  HandCoinsIcon,
  LayoutDashboardIcon,
  LockIcon,
  ReceiptIcon,
  ScrollTextIcon,
  SettingsIcon,
  TruckIcon,
  UsersIcon,
  WalletIcon,
  WaypointsIcon,
} from "lucide-react"

import type { Role } from "@/hooks/use-current-user"

export type NavItem = {
  title: string
  icon: React.ReactNode
  /** Route path. */
  to: string
  /** Roles that can see the item. Omit = every role. */
  roles?: Role[]
}

export type NavGroup = { label: string; items: NavItem[] }

// Company-wide screens: super_admin + the view-only admin (backend require_view_all).
const VIEW_ALL: Role[] = ["super_admin", "admin"]

// Mirrors docs/FRONTEND.md §5 and the RBAC matrix in §7.
export const NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", icon: <LayoutDashboardIcon />, to: "/", roles: VIEW_ALL },
      { title: "Cash flow", icon: <WaypointsIcon />, to: "/cashflow", roles: VIEW_ALL },
      { title: "SLA alerts", icon: <BellIcon />, to: "/alerts" },
    ],
  },
  {
    label: "Revenue",
    items: [
      { title: "Projects", icon: <FolderKanbanIcon />, to: "/projects" },
      { title: "Purchase orders", icon: <FileTextIcon />, to: "/pos" },
      { title: "Invoices", icon: <ReceiptIcon />, to: "/invoices" },
      { title: "Clients", icon: <BuildingIcon />, to: "/clients" },
    ],
  },
  {
    label: "Costs",
    items: [
      { title: "External costs", icon: <BanknoteIcon />, to: "/costs" },
      { title: "Vendors", icon: <TruckIcon />, to: "/vendors" },
      { title: "Vendor ledger", icon: <BookOpenIcon />, to: "/vendor-ledger", roles: VIEW_ALL },
      { title: "Credits", icon: <HandCoinsIcon />, to: "/credits" },
      { title: "Overhead", icon: <WalletIcon />, to: "/overhead" },
    ],
  },
  {
    label: "Admin",
    items: [
      { title: "Month locks", icon: <LockIcon />, to: "/locks" },
      { title: "Audit log", icon: <ScrollTextIcon />, to: "/audit", roles: VIEW_ALL },
      { title: "Users", icon: <UsersIcon />, to: "/users", roles: ["super_admin"] },
      { title: "Settings", icon: <SettingsIcon />, to: "/settings" },
    ],
  },
]
