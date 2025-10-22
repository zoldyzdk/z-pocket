"use server"

import { db } from "@/db"
import { categories } from "@/db/schema"
import { auth } from "@/lib/auth"
import { eq } from "drizzle-orm"
import { headers } from "next/headers"

/**
 * Server action to fetch all categories for the current user.
 * @returns A promise that resolves to an array of category names.
 */
export const getCategories = async (): Promise<string[]> => {
  try {
    // Get the current session to ensure user is authenticated
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user?.id) {
      return []
    }

    // Fetch all categories for the user
    const userCategories = await db
      .select()
      .from(categories)
      .where(eq(categories.userId, session.user.id))

    // Return just the category names for autocomplete
    return userCategories.map((cat) => cat.name)
  } catch (error) {
    console.error("Error fetching categories:", error)
    return []
  }
}
