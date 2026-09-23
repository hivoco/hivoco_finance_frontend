import { Navigate } from "react-router"

import { Skeleton } from "@/components/ui/skeleton"
import { useCanViewAll, useCurrentUser } from "@/hooks/use-current-user"
import { DashboardPage } from "@/pages/dashboard"

/**
 * Landing screen. The company dashboard is for super_admin + the view-only admin
 * (the backend 403s a project_user on /reports/company-dashboard and
 * /reports/cashflow), so project users go straight to their projects.
 */
export function HomePage() {
  const { isLoading } = useCurrentUser()
  const canViewAll = useCanViewAll()

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <Skeleton className="h-36" />
        <Skeleton className="h-64" />
      </div>
    )
  }
  if (!canViewAll) return <Navigate to="/projects" replace />
  return <DashboardPage />
}
