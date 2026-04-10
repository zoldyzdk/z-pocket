import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

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

const { updateMock, updateSetMock, updateWhereMock } = vi.hoisted(() => {
  const updateWhereMockInner = vi.fn().mockResolvedValue(undefined)
  const updateSetMockInner = vi.fn().mockReturnValue({
    where: updateWhereMockInner,
  })
  const updateMockInner = vi.fn().mockReturnValue({
    set: updateSetMockInner,
  })
  return {
    updateMock: updateMockInner,
    updateSetMock: updateSetMockInner,
    updateWhereMock: updateWhereMockInner,
  }
})

vi.mock("@/db", () => ({
  db: {
    update: updateMock,
  },
}))

import { archiveLink } from "@/actions/archiveLink"

function mockSession(userId: string | null) {
  getSessionMock.mockResolvedValue(userId ? { user: { id: userId } } : null)
}

describe("archiveLink", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    updateWhereMock.mockResolvedValue(undefined)
  })

  afterEach(() => {
    updateMock.mockReset()
    updateSetMock.mockReset()
    updateWhereMock.mockReset()
  })

  test("revalidates dashboard and tags on success", async () => {
    mockSession("user-1")

    const result = await archiveLink("link-1")

    expect(result.error).toBe(false)
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard")
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard/tags")
  })

  test("does not revalidate when unauthenticated", async () => {
    mockSession(null)

    const result = await archiveLink("link-1")

    expect(result.error).toBe(true)
    expect(revalidatePathMock).not.toHaveBeenCalled()
  })
})
