"use server"

import { db } from "@/db"
import { categories } from "@/db/schema"
import { auth } from "@/lib/auth"
import { asc, eq } from "drizzle-orm"
import { headers } from "next/headers"

/**
 * Server action to fetch all categories for the current user.
 * @returns A promise that resolves to an array of category names.
 * Unauthenticated callers receive an empty list; database errors propagate.
 */
export const getCategories = async (): Promise<string[]> => {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return []
  }

  const userCategories = await db
    .select({ name: categories.name })
    .from(categories)
    .where(eq(categories.userId, session.user.id))
    .orderBy(asc(categories.name))

  return userCategories.map((cat) => cat.name)
}
