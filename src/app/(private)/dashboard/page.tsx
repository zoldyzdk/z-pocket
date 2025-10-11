import LinkCard from "@/components/LinkCard";
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
    <div className="p-4 flex gap-3.5 flex-wrap justify-center">
      {
        Array.from({ length: 10 }, (_, index) => (
          <LinkCard
            title="React Documentation"
            description="The official React documentation with guides and API reference"
            image="https://react.dev/favicon.ico"
            tags={["React", "Documentation", "Frontend"]}
            source="react.dev"
            readTime="5 min read"
          />
        ))
      }
    </div>
    // </SidebarProvider>
  )
}
