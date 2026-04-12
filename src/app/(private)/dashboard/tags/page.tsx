import { TagsManagement } from "@/components/tags-management"
import { auth } from "@/lib/auth"
import { getUserCategoriesWithUsage } from "@/lib/queries"
import { headers } from "next/headers"

export default async function TagsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) {
    return (
      <div className="p-4">
        <h1>You are not logged in</h1>
        <p>Please log in to access this page.</p>
      </div>
    )
  }

  const categories = await getUserCategoriesWithUsage(session.user.id)

  return (
    <section className="p-4">
      <TagsManagement initialCategories={categories} />
    </section>
  )
}
