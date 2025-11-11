"use server"

import { db } from "@/db"
import { links } from "@/db/schema"
import { auth } from "@/lib/auth"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"

export async function deleteLinks(linkId: string) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user?.id) {
      throw new Error("You must be logged in to delete links")
    }

    await db.delete(links).where(eq(links.id, linkId))
    revalidatePath("/dashboard")
    return {
      error: false,
      message: "Link deleted successfully!",
    }
  } catch (error) {
    console.error("Error deleting link:", error)
    return {
      error: true,
      message: "Failed to delete link. Please try again.",
    }
  }
}
