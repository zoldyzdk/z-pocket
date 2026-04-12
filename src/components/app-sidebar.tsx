import { auth } from "@/lib/auth"
import { headers } from "next/headers"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
} from "@/components/ui/sidebar"
import { getCategoriesWithLinks } from "@/lib/queries"
import { CategoriesSection } from "./categories-section"
import { DashboardSidebarMainNav } from "./dashboard-sidebar-main-nav"
import { ShimmeringText } from "./ui/shimmering-text"

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
            <DashboardSidebarMainNav />
          </SidebarGroupContent>
        </SidebarGroup>
        <CategoriesSection categories={categories} />
      </SidebarContent>
    </Sidebar>
  )
}