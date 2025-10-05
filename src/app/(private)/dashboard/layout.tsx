import { AppSidebar } from "@/components/app-sidebar"
import { Navbar } from "@/components/Navbar"
import PrivateRoutes from "@/components/PrivateRoutes"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"

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
    </main>
  )
}
