import { beforeEach, describe, expect, test, vi } from "vitest"

// Global vitest.setup mocks this for component tests; exercise the real action here.
vi.unmock("@/actions/getCategories")

const getSessionMock = vi.fn()
vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: (...args: unknown[]) => getSessionMock(...args),
    },
  },
}))

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}))

const selectMock = vi.hoisted(() => vi.fn())

vi.mock("@/db", () => ({
  db: {
    get select() {
      return selectMock
    },
  },
}))

import { getCategories } from "@/actions/getCategories"

describe("getCategories", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test("returns empty array when unauthenticated", async () => {
    getSessionMock.mockResolvedValue(null)

    const names = await getCategories()

    expect(names).toEqual([])
    expect(selectMock).not.toHaveBeenCalled()
  })

  test("returns sorted names when authenticated and query succeeds", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } })
    const promise = Promise.resolve([{ name: "Beta" }, { name: "Alpha" }])
    selectMock.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnValue(promise),
    })

    const names = await getCategories()

    expect(names).toEqual(["Beta", "Alpha"])
  })

  test("propagates database errors instead of returning empty", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } })
    const err = new Error("turso down")
    selectMock.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnValue(Promise.reject(err)),
    })

    await expect(getCategories()).rejects.toThrow("turso down")
  })
})
