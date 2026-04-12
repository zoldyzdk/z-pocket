"use client"

import { Archive, Home, Tags } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const items = [
  { title: "Home", url: "/dashboard", icon: Home },
  { title: "Tags", url: "/dashboard/tags", icon: Tags },
  { title: "Archived", url: "/dashboard/archived", icon: Archive },
] as const

function isNavItemActive(pathname: string | null, url: string): boolean {
  if (!pathname) return false
  if (url === "/dashboard") {
    return pathname === "/dashboard"
  }
  return pathname === url || pathname.startsWith(`${url}/`)
}

export function DashboardSidebarMainNav() {
  const pathname = usePathname()

  return (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton
            asChild
            isActive={isNavItemActive(pathname, item.url)}
          >
            <Link href={item.url}>
              <item.icon />
              <span>{item.title}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  )
}
