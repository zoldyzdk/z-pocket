"use server"

import { db } from "@/db"
import { categories, linkCategories } from "@/db/schema"
import { normalizeCategoryKey, normalizeCategoryName } from "@/lib/categories"
import { auth } from "@/lib/auth"
import { and, eq, ne, sql } from "drizzle-orm"
import { nanoid } from "nanoid"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"

const UNAUTHED = "You must be logged in." as const
const NOT_FOUND = "Tag not found." as const

export type CreateCategoryResult =
  | { ok: true }
  | { ok: false; error: string }

export type RenameCategoryResult =
  | { ok: true }
  | { ok: false; error: string }

export type DeleteCategoryResult =
  | { ok: true; detachedLinks: number }
  | { ok: false; error: string }

export type GetCategoryDeletePreviewResult =
  | { ok: true; usageCount: number }
  | { ok: false; error: string }

async function getSessionUserId(): Promise<string | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })
  return session?.user?.id ?? null
}

async function findCategoryByKeyForUser(userId: string, key: string) {
  const rows = await db
    .select()
    .from(categories)
    .where(
      and(eq(categories.userId, userId), sql`lower(${categories.name}) = ${key}`),
    )
    .limit(1)
  return rows[0] ?? null
}

async function getOwnedCategory(userId: string, categoryId: string) {
  const rows = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)))
    .limit(1)
  return rows[0] ?? null
}

function revalidateCategoryViews() {
  revalidatePath("/dashboard")
  revalidatePath("/dashboard/tags")
}

export async function createCategory(input: { name: string }): Promise<CreateCategoryResult> {
  const userId = await getSessionUserId()
  if (!userId) {
    return { ok: false, error: UNAUTHED }
  }

  const name = normalizeCategoryName(input.name)
  const key = normalizeCategoryKey(input.name)
  if (!key) {
    return { ok: false, error: "Tag name is required." }
  }

  const existing = await findCategoryByKeyForUser(userId, key)
  if (existing) {
    return { ok: false, error: "Tag already exists." }
  }

  await db.insert(categories).values({
    id: nanoid(),
    userId,
    name,
    color: null,
    icon: null,
  })

  revalidateCategoryViews()
  return { ok: true }
}

export async function renameCategory(input: {
  categoryId: string
  newName: string
}): Promise<RenameCategoryResult> {
  const userId = await getSessionUserId()
  if (!userId) {
    return { ok: false, error: UNAUTHED }
  }

  const name = normalizeCategoryName(input.newName)
  const key = normalizeCategoryKey(input.newName)
  if (!key) {
    return { ok: false, error: "Tag name is required." }
  }

  const owned = await getOwnedCategory(userId, input.categoryId)
  if (!owned) {
    return { ok: false, error: NOT_FOUND }
  }

  const conflicting = await db
    .select()
    .from(categories)
    .where(
      and(
        eq(categories.userId, userId),
        sql`lower(${categories.name}) = ${key}`,
        ne(categories.id, input.categoryId),
      ),
    )
    .limit(1)
  if (conflicting.length > 0) {
    return { ok: false, error: "Tag already exists." }
  }

  await db
    .update(categories)
    .set({ name, updatedAt: sql`(datetime('now'))` })
    .where(and(eq(categories.id, input.categoryId), eq(categories.userId, userId)))

  revalidateCategoryViews()
  return { ok: true }
}

export async function getCategoryDeletePreview(input: {
  categoryId: string
}): Promise<GetCategoryDeletePreviewResult> {
  const userId = await getSessionUserId()
  if (!userId) {
    return { ok: false, error: UNAUTHED }
  }

  const owned = await getOwnedCategory(userId, input.categoryId)
  if (!owned) {
    return { ok: false, error: NOT_FOUND }
  }

  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(linkCategories)
    .where(eq(linkCategories.categoryId, input.categoryId))

  return { ok: true, usageCount: Number(row?.count ?? 0) }
}

export async function deleteCategory(input: { categoryId: string }): Promise<DeleteCategoryResult> {
  const userId = await getSessionUserId()
  if (!userId) {
    return { ok: false, error: UNAUTHED }
  }

  const owned = await getOwnedCategory(userId, input.categoryId)
  if (!owned) {
    return { ok: false, error: NOT_FOUND }
  }

  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(linkCategories)
    .where(eq(linkCategories.categoryId, input.categoryId))

  const detachedLinks = Number(countRow?.count ?? 0)

  await db.delete(linkCategories).where(eq(linkCategories.categoryId, input.categoryId))

  await db
    .delete(categories)
    .where(and(eq(categories.id, input.categoryId), eq(categories.userId, userId)))

  revalidateCategoryViews()
  return { ok: true, detachedLinks }
}
