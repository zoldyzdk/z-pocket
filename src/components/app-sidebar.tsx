import { Archive, Calendar, Home, Inbox, Search, Settings } from "lucide-react"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { ShimmeringText } from "./ui/shimmering-text"
import { getCategoriesWithLinks } from "@/lib/queries"
import { CategoryMenuItem } from "./category-menu-item"
import { AllCategoriesMenuItem } from "./all-categories-menu-item"
import Link from "next/link"

// Menu items.
const items = [
  {
    title: "Home",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Archived",
    url: "/dashboard?isArchived=true",
    icon: Archive,
  }
]

export async function AppSidebar() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  const categories = session?.user?.id
    ? await getCategoriesWithLinks(session.user.id)
    : []

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarHeader>
            <ShimmeringText
              text="Z-pocket"
              className="text-2xl font-bold uppercase"
              duration={1.5}
              repeatDelay={1}
            />
          </SidebarHeader>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {categories.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Categories</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <AllCategoriesMenuItem />
                {categories.map((category) => (
                  <CategoryMenuItem key={category.id} categoryName={category.name} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  )
}