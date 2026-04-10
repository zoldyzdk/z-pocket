import { afterEach, describe, expect, test, vi } from "vitest"
import { asc } from "drizzle-orm"
import { categories } from "@/db/schema"

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

  test("orders by category name ascending", async () => {
    mockQueryChain([
      { id: "b", name: "Beta", usageCount: 1 },
      { id: "a", name: "Alpha", usageCount: 2 },
    ])

    await getUserCategoriesWithUsage("user-1")

    const builder = selectMock.mock.results[0]?.value as ReturnType<typeof mockQueryChain>
    expect(builder.orderBy).toHaveBeenCalledWith(asc(categories.name))
  })

  test("normalizes usageCount to a number", async () => {
    mockQueryChain([{ id: "c1", name: "Solo", usageCount: "3" as unknown as number }])

    const rows = await getUserCategoriesWithUsage("user-1")

    expect(rows).toHaveLength(1)
    expect(rows[0].usageCount).toBe(3)
    expect(typeof rows[0].usageCount).toBe("number")
  })
})
