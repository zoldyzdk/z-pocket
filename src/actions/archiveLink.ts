"use server"

import { db } from "@/db"
import { links } from "@/db/schema"
import { auth } from "@/lib/auth"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"

export async function archiveLink(linkId: string) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user?.id) {
      throw new Error("You must be logged in to archive links")
    }

    await db
      .update(links)
      .set({
        isArchived: true,
        archivedAt: new Date().toISOString(),
      })
      .where(eq(links.id, linkId))
    revalidatePath("/dashboard")
    return {
      error: false,
      message: "Link archived successfully!",
    }
  } catch (error) {
    return {
      error: true,
      message: "Failed to archive link. Please try again.",
    }
  }
}
