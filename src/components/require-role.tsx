import { ShieldAlertIcon } from "lucide-react"

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { useCurrentUser, type Role } from "@/hooks/use-current-user"

/** Route wrapper for screens only some roles may open (Users, Audit, company reports). */
export function RequireRole({ roles, children }: { roles: Role[]; children: React.ReactNode }) {
  const { data: user, isLoading } = useCurrentUser()
  if (isLoading) return <Skeleton className="mx-4 h-40 lg:mx-6" />
  if (!user || !roles.includes(user.role as Role)) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ShieldAlertIcon />
          </EmptyMedia>
          <EmptyTitle>No access</EmptyTitle>
          <EmptyDescription>Your role can&apos;t open this screen.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }
  return children
}
