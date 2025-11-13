import LinkCard from "@/components/LinkCard";
import SearchLinks from "@/components/search-links";
import { SidebarProvider } from "@/components/ui/sidebar"
import { auth } from "@/lib/auth";
import { headers } from "next/headers"
import { getUserLinks } from "@/lib/queries"

function formatReadTime(minutes: number | null): string | undefined {
  if (!minutes) return undefined
  return `${minutes} min read`
}

export default async function page({
  searchParams
}: {
  searchParams: Promise<{ search?: string; category?: string }>
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })
  if (!session) {
    return (
      <div>
        <h1>You are not logged in</h1>
        <p>Please log in to access this page.</p>
      </div>
    )
  }

  const resolvedSearchParams = await searchParams
  const userLinks = await getUserLinks(session.user.id, {
    limit: 20,
    searchQuery: resolvedSearchParams.search,
    categoryName: resolvedSearchParams.category
  })

  return (
    // <SidebarProvider>
    <div className="p-4">
      <SearchLinks />

      {userLinks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <h2 className="text-xl font-semibold text-muted-foreground mb-2">
            {resolvedSearchParams.search || resolvedSearchParams.category
              ? "No links found"
              : "No saved links yet"}
          </h2>
          <p className="text-muted-foreground">
            {resolvedSearchParams.search || resolvedSearchParams.category
              ? "Try adjusting your search terms or category filter"
              : "Start by adding your first link!"}
          </p>
        </div>
      ) : (
        <div className="flex gap-3.5 flex-wrap justify-center">
          {userLinks.map((link) => (
            <LinkCard
              key={link.id}
              linkId={link.id}
              title={link.title || "Untitled Link"}
              description={link.description || undefined}
              image={link.imageUrl || undefined}
              tags={link.categories}
              source={link.url}
              readTime={formatReadTime(link.estimatedReadingTime)}
            />
          ))}
        </div>
      )}
    </div>
    // </SidebarProvider>
  )
}
