import { db } from "@/db"
import { links, linkCategories, categories } from "@/db/schema"
import { and, eq, desc, or, like } from "drizzle-orm"

export async function getUserLinks(
  userId: string,
  options?: {
    limit?: number
    searchQuery?: string
  }
) {
  const { limit = 20, searchQuery } = options || {}

  let whereConditions = and(eq(links.userId, userId), eq(links.isArchived, false))

  // Add search filter if provided
  if (searchQuery) {
    whereConditions = and(
      whereConditions,
      or(like(links.title, `%${searchQuery}%`), like(links.description, `%${searchQuery}%`))
    )
  }

  const userLinks = await db
    .select()
    .from(links)
    .where(whereConditions)
    .orderBy(desc(links.createdAt))
    .limit(limit)

  // Fetch categories for each link
  const linksWithCategories = await Promise.all(
    userLinks.map(async (link) => {
      const linkCats = await db
        .select({
          name: categories.name,
        })
        .from(linkCategories)
        .innerJoin(categories, eq(linkCategories.categoryId, categories.id))
        .where(eq(linkCategories.linkId, link.id))

      return {
        ...link,
        categories: linkCats.map((cat) => cat.name),
      }
    })
  )

  return linksWithCategories
}
