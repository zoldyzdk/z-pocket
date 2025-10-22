"use server"

import { db } from "@/db"
import { links, categories, linkCategories } from "@/db/schema"
import { auth } from "@/lib/auth"
import { nanoid } from "nanoid"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { eq, and } from "drizzle-orm"

type AddLinkResponse = Promise<{
  success: boolean
  message: string
  linkId?: string
}>

type LinkFormData = {
  url: string
  title?: string
  description?: string
  imageUrl?: string
  categories?: string[]
}

/**
 * Server action to add a new link to the database.
 * @param formData - The link data from the form.
 * @returns A promise that resolves to a success message or throws an error.
 */
export const addLink = async (formData: LinkFormData): AddLinkResponse => {
  try {
    // Get the current session to ensure user is authenticated
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user?.id) {
      throw new Error("You must be logged in to add links")
    }

    // Validate required fields
    if (!formData.url) {
      throw new Error("URL is required")
    }

    // Generate a unique ID for the link
    const linkId = nanoid()

    // Insert the new link into the database
    await db.insert(links).values({
      id: linkId,
      userId: session.user.id,
      url: formData.url,
      title: formData.title || null,
      description: formData.description || null,
      imageUrl: formData.imageUrl || null,
      type: null, // Can be enhanced later to auto-detect content type
      estimatedReadingTime: null,
      wordCount: null,
      isArchived: false,
    })

    // Handle categories if provided
    if (formData.categories && formData.categories.length > 0) {
      for (const categoryName of formData.categories) {
        const normalizedName = categoryName.trim()
        if (!normalizedName) continue

        // Check if category already exists for this user (case-insensitive)
        const existingCategory = await db
          .select()
          .from(categories)
          .where(and(eq(categories.userId, session.user.id), eq(categories.name, normalizedName)))
          .limit(1)

        let categoryId: string

        if (existingCategory.length > 0) {
          // Use existing category
          categoryId = existingCategory[0].id
        } else {
          // Create new category
          categoryId = nanoid()
          await db.insert(categories).values({
            id: categoryId,
            userId: session.user.id,
            name: normalizedName,
            color: null,
            icon: null,
          })
        }

        // Link the category to the link
        await db.insert(linkCategories).values({
          id: nanoid(),
          linkId: linkId,
          categoryId: categoryId,
        })
      }
    }

    // Revalidate the dashboard page to show the new link
    revalidatePath("/dashboard")

    return {
      success: true,
      message: "Link added successfully!",
      linkId: linkId,
    }
  } catch (error) {
    console.error("Error adding link:", error)

    if (error instanceof Error) {
      throw new Error(error.message)
    }

    throw new Error("Failed to add link. Please try again.")
  }
}
