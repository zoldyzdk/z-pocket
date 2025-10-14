import { db } from "@/db"
import { links } from "@/db/schema"
import { and, eq, desc, or, like } from "drizzle-orm"

export async function getUserLinks(userId: string, options?: {
  limit?: number
  searchQuery?: string
}) {
  const { limit = 20, searchQuery } = options || {}
  
  let query = db
    .select()
    .from(links)
    .where(and(
      eq(links.userId, userId),
      eq(links.isArchived, false)
    ))
    .orderBy(desc(links.createdAt))
    .limit(limit)
  
  // Add search filter if provided
  if (searchQuery) {
    query = query.where(
      or(
        like(links.title, `%${searchQuery}%`),
        like(links.description, `%${searchQuery}%`)
      )
    )
  }
  
  return await query
}
