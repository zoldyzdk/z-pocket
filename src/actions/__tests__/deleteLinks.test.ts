import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

// Global vitest.setup mocks this for component tests; exercise the real action here.
vi.unmock("@/actions/deleteLinks")

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

const revalidatePathMock = vi.fn()
vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}))

const { deleteMock, deleteWhereMock } = vi.hoisted(() => {
  const deleteWhereMockInner = vi.fn().mockResolvedValue(undefined)
  const deleteMockInner = vi.fn().mockReturnValue({
    where: deleteWhereMockInner,
  })
  return {
    deleteMock: deleteMockInner,
    deleteWhereMock: deleteWhereMockInner,
  }
})

vi.mock("@/db", () => ({
  db: {
    delete: deleteMock,
  },
}))

import { deleteLinks } from "@/actions/deleteLinks"

function mockSession(userId: string | null) {
  getSessionMock.mockResolvedValue(userId ? { user: { id: userId } } : null)
}

describe("deleteLinks", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    deleteWhereMock.mockResolvedValue(undefined)
  })

  afterEach(() => {
    deleteMock.mockReset()
    deleteWhereMock.mockReset()
  })

  test("revalidates dashboard and tags on success", async () => {
    mockSession("user-1")

    const result = await deleteLinks("link-1")

    expect(result.error).toBe(false)
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard")
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard/tags")
  })

  test("does not revalidate when unauthenticated", async () => {
    mockSession(null)

    const result = await deleteLinks("link-1")

    expect(result.error).toBe(true)
    expect(revalidatePathMock).not.toHaveBeenCalled()
  })
})
