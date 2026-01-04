import { AppSidebar } from "@/components/app-sidebar"
import { Navbar } from "@/components/Navbar/Navbar"
import PrivateRoutes from "@/components/PrivateRoutes"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { CommandMenu } from "@/components/command-menu"

export default function LoggedAreaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main>
      <PrivateRoutes >
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset className="flex gap-2">
            <Navbar />
            {children}
          </SidebarInset>
        </SidebarProvider>
      </PrivateRoutes>
      <CommandMenu />
    </main>
  )
}
