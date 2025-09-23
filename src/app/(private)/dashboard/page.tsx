import { SidebarProvider } from "@/components/ui/sidebar"
import { auth } from "@/lib/auth"; // path to your Better Auth server instance
import { headers } from "next/headers"

export default async function page() {
  const session = await auth.api.getSession({
    headers: await headers(), // you need to pass the headers object.
  })
  if (!session) {
    return (
      <div>
        <h1>You are not logged in</h1>
        <p>Please log in to access this page.</p>
      </div>
    )
  }
  return (
    // <SidebarProvider>
    <div>
      You are logged in as {session.user.name}
    </div>
    // </SidebarProvider>
  )
}
