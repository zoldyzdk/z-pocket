"use server"

import { db } from "@/db"
import { links } from "@/db/schema"
import { auth } from "@/lib/auth"
import { nanoid } from "nanoid"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"

type AddLinkResponse = Promise<{
  success: boolean
  message: string
  linkId?: string
}>

type LinkFormData = {
  url: string
  title?: string
  description?: string
  tags?: string // Note: tags are not currently stored in the database schema
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
      headers: await headers()
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
      type: null, // Can be enhanced later to auto-detect content type
      estimatedReadingTime: null,
      wordCount: null,
      isArchived: false,
    })

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
