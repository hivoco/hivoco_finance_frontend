import { NavLink, useMatch } from "react-router"

import type { NavGroup, NavItem } from "@/config/nav"
import type { Role } from "@/hooks/use-current-user"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavMain({ groups, role }: { groups: NavGroup[]; role?: Role }) {
  return groups.map((group) => {
    const items = group.items.filter(
      (item) => !item.roles || (role && item.roles.includes(role))
    )
    if (items.length === 0) return null

    return (
      <SidebarGroup key={group.label}>
        <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <NavMainLink item={item} />
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroup>
    )
  })
}

function NavMainLink({ item }: { item: NavItem }) {
  // Detail pages (/projects/12) keep their list item highlighted.
  const isActive = useMatch({ path: item.to, end: item.to === "/" }) !== null
  return (
    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
      <NavLink to={item.to} end={item.to === "/"}>
        {item.icon}
        <span>{item.title}</span>
      </NavLink>
    </SidebarMenuButton>
  )
}
