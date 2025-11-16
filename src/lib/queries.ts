import { db } from "@/db"
import { links, linkCategories, categories } from "@/db/schema"
import { and, eq, desc, or, like, inArray } from "drizzle-orm"

export async function getCategoriesWithLinks(userId: string) {
  const categoriesWithLinks = await db
    .selectDistinct({
      id: categories.id,
      name: categories.name,
    })
    .from(categories)
    .innerJoin(linkCategories, eq(categories.id, linkCategories.categoryId))
    .innerJoin(links, eq(linkCategories.linkId, links.id))
    .where(and(eq(categories.userId, userId), eq(links.isArchived, false)))

  return categoriesWithLinks
}

export async function getUserLinks(
  userId: string,
  options?: {
    limit?: number
    searchQuery?: string
    categoryName?: string
  }
) {
  const { limit = 20, searchQuery, categoryName } = options || {}

  let whereConditions = and(eq(links.userId, userId), eq(links.isArchived, false))

  // Add search filter if provided
  if (searchQuery) {
    whereConditions = and(
      whereConditions,
      or(like(links.title, `%${searchQuery}%`), like(links.description, `%${searchQuery}%`))
    )
  }

  // Add category filter if provided
  if (categoryName) {
    // Get category ID from name
    const category = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.userId, userId), eq(categories.name, categoryName)))
      .limit(1)

    if (category.length > 0) {
      // Get link IDs that belong to this category
      const linkIdsInCategory = await db
        .select({ linkId: linkCategories.linkId })
        .from(linkCategories)
        .where(eq(linkCategories.categoryId, category[0].id))

      if (linkIdsInCategory.length > 0) {
        whereConditions = and(
          whereConditions,
          inArray(
            links.id,
            linkIdsInCategory.map((lc) => lc.linkId)
          )
        )
      } else {
        // No links in this category, return empty array
        return []
      }
    } else {
      // Category doesn't exist, return empty array
      return []
    }
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

export async function getArchivedLinks(userId: string) {
  const archivedLinks = await db
    .select({
      id: links.id,
      title: links.title,
      url: links.url,
      archivedAt: links.archivedAt,
    })
    .from(links)
    .where(and(eq(links.userId, userId), eq(links.isArchived, true)))
    .orderBy(desc(links.archivedAt))

  return archivedLinks
}
