import * as React from "react"
import { Link } from "react-router"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { NAV } from "@/config/nav"
import { useCurrentUser, type Role } from "@/hooks/use-current-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarRail,
} from "@/components/ui/sidebar"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: user } = useCurrentUser()

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/">
                <img src="/hivoco-mark.png" alt="" className="size-8 shrink-0" />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-bold">HiVoco</span>
                  <span className="truncate text-xs">Finance</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain groups={NAV} role={user?.role as Role | undefined} />
      </SidebarContent>
      <SidebarFooter>
        {user ? <NavUser user={user} /> : <SidebarMenuSkeleton showIcon />}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
