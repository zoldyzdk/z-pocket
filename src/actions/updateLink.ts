"use server"

import { db } from "@/db"
import { links, categories, linkCategories } from "@/db/schema"
import { auth } from "@/lib/auth"
import { nanoid } from "nanoid"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { eq, and } from "drizzle-orm"

type UpdateLinkResponse = Promise<{
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
 * Server action to update an existing link in the database.
 * @param linkId - The ID of the link to update.
 * @param formData - The updated link data from the form.
 * @returns A promise that resolves to a success message or throws an error.
 */
export const updateLink = async (linkId: string, formData: LinkFormData): UpdateLinkResponse => {
  try {
    // Get the current session to ensure user is authenticated
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user?.id) {
      throw new Error("You must be logged in to update links")
    }

    // Validate required fields
    if (!formData.url) {
      throw new Error("URL is required")
    }

    if (!linkId) {
      throw new Error("Link ID is required")
    }

    // Verify the link belongs to the user
    const existingLink = await db
      .select()
      .from(links)
      .where(and(eq(links.id, linkId), eq(links.userId, session.user.id)))
      .limit(1)

    if (existingLink.length === 0) {
      throw new Error("Link not found or you don't have permission to edit it")
    }

    // Update the link in the database
    await db
      .update(links)
      .set({
        url: formData.url,
        title: formData.title || null,
        description: formData.description || null,
        imageUrl: formData.imageUrl || null,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(links.id, linkId), eq(links.userId, session.user.id)))

    // Remove all existing category associations for this link
    await db.delete(linkCategories).where(eq(linkCategories.linkId, linkId))

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

    // Revalidate the dashboard page to show the updated link
    revalidatePath("/dashboard")

    return {
      success: true,
      message: "Link updated successfully!",
      linkId: linkId,
    }
  } catch (error) {
    console.error("Error updating link:", error)

    if (error instanceof Error) {
      throw new Error(error.message)
    }

    throw new Error("Failed to update link. Please try again.")
  }
}
