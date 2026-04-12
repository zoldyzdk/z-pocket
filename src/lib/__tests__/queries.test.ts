import { afterEach, describe, expect, test, vi } from "vitest"
import { and, asc, eq } from "drizzle-orm"
import { categories, linkCategories, links } from "@/db/schema"

const selectMock = vi.fn()

vi.mock("@/db", () => ({
  db: {
    get select() {
      return selectMock
    },
  },
}))

import { getUserCategoriesWithUsage } from "@/lib/queries"

function mockQueryChain<T>(resolved: T) {
  const thenable = {
    then: (onFulfilled: (value: T) => unknown) => Promise.resolve(resolved).then(onFulfilled),
  }
  const builder = {
    from: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnValue(thenable),
  }
  selectMock.mockReturnValue(builder)
  return builder
}

describe("getUserCategoriesWithUsage", () => {
  afterEach(() => {
    selectMock.mockReset()
  })

  test("configures joins, category scope, link user + non-archived filters, groupBy, and orderBy(asc name)", async () => {
    const userId = "user-1"
    mockQueryChain([{ id: "b", name: "Beta", usageCount: 1 }])

    await getUserCategoriesWithUsage(userId)

    const builder = selectMock.mock.results[0]?.value as ReturnType<typeof mockQueryChain>

    expect(builder.from).toHaveBeenCalledWith(categories)
    expect(builder.leftJoin).toHaveBeenNthCalledWith(
      1,
      linkCategories,
      eq(categories.id, linkCategories.categoryId),
    )
    expect(builder.leftJoin).toHaveBeenNthCalledWith(
      2,
      links,
      and(
        eq(linkCategories.linkId, links.id),
        eq(links.userId, userId),
        eq(links.isArchived, false),
      ),
    )
    expect(builder.where).toHaveBeenCalledWith(eq(categories.userId, userId))
    expect(builder.groupBy).toHaveBeenCalledWith(categories.id, categories.name)
    expect(builder.orderBy).toHaveBeenCalledWith(asc(categories.name))
  })

  test("normalizes string usageCount to a number", async () => {
    mockQueryChain([{ id: "c1", name: "Solo", usageCount: "3" as unknown as number }])

    const rows = await getUserCategoriesWithUsage("user-1")

    expect(rows).toHaveLength(1)
    expect(rows[0].usageCount).toBe(3)
    expect(typeof rows[0].usageCount).toBe("number")
  })

  test.each([
    { label: "null", usageCount: null as unknown as number },
    { label: "undefined", usageCount: undefined as unknown as number },
    { label: "numeric zero", usageCount: 0 },
  ])("normalizes $label usageCount to 0", async ({ usageCount }) => {
    mockQueryChain([{ id: "c1", name: "Empty", usageCount }])

    const rows = await getUserCategoriesWithUsage("user-1")

    expect(rows[0].usageCount).toBe(0)
  })
})
