import { auth } from "@/lib/auth"
import { Archive, Home } from "lucide-react"
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
import { getCategoriesWithLinks } from "@/lib/queries"
import Link from "next/link"
import { ShimmeringText } from "./ui/shimmering-text"
import { CategoriesSection } from "./categories-section"

// Menu items.
const items = [
  {
    title: "Home",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Archived",
    url: "/dashboard/archived",
    icon: Archive,
  }
]

export async function AppSidebar() {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
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
        <CategoriesSection categories={categories} />
      </SidebarContent>
    </Sidebar>
  )
}