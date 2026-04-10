import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

// Use real server actions here; vitest.setup.tsx mocks this module for component tests.
vi.unmock("@/actions/manageCategories")

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

const {
  selectMock,
  insertMock,
  insertValuesMock,
  updateMock,
  updateSetMock,
  updateWhereMock,
  deleteMock,
  deleteWhereMock,
  transactionMock,
} = vi.hoisted(() => {
  const selectMockInner = vi.fn()
  const insertValuesMockInner = vi.fn().mockResolvedValue(undefined)
  const insertMockInner = vi.fn().mockReturnValue({ values: insertValuesMockInner })
  const updateSetMockInner = vi.fn().mockReturnThis()
  const updateWhereMockInner = vi.fn().mockResolvedValue(undefined)
  const updateMockInner = vi.fn().mockReturnValue({
    set: updateSetMockInner,
    where: updateWhereMockInner,
  })
  const deleteWhereMockInner = vi.fn().mockResolvedValue(undefined)
  const deleteMockInner = vi.fn().mockReturnValue({ where: deleteWhereMockInner })
  const transactionMockInner = vi.fn()

  return {
    selectMock: selectMockInner,
    insertMock: insertMockInner,
    insertValuesMock: insertValuesMockInner,
    updateMock: updateMockInner,
    updateSetMock: updateSetMockInner,
    updateWhereMock: updateWhereMockInner,
    deleteMock: deleteMockInner,
    deleteWhereMock: deleteWhereMockInner,
    transactionMock: transactionMockInner,
  }
})

function makeTx() {
  return {
    get select() {
      return selectMock
    },
    insert: insertMock,
    update: updateMock,
    delete: deleteMock,
  }
}

vi.mock("@/db", () => ({
  db: {
    get select() {
      return selectMock
    },
    insert: insertMock,
    update: updateMock,
    delete: deleteMock,
    transaction: transactionMock,
  },
}))

import {
  createCategory,
  deleteCategory,
  getCategoryDeletePreview,
  renameCategory,
} from "@/actions/manageCategories"

type SelectMode = "limit" | "whereEnd"

const selectQueue: Array<{ rows: unknown[]; mode: SelectMode }> = []

function enqueueSelect(rows: unknown[], mode: SelectMode = "limit") {
  selectQueue.push({ rows, mode })
}

function setupSelectMockFromQueue() {
  selectMock.mockImplementation(() => {
    const item = selectQueue.shift()
    if (!item) {
      throw new Error("selectMock: no queued result")
    }
    const promise = Promise.resolve(item.rows)
    if (item.mode === "limit") {
      return {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnValue(promise),
      }
    }
    return {
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnValue(promise),
    }
  })
}

function mockSession(userId: string | null) {
  getSessionMock.mockResolvedValue(userId ? { user: { id: userId } } : null)
}

describe("manageCategories", () => {
  beforeEach(() => {
    selectQueue.length = 0
    vi.clearAllMocks()
    setupSelectMockFromQueue()
    insertValuesMock.mockResolvedValue(undefined)
    updateWhereMock.mockResolvedValue(undefined)
    deleteWhereMock.mockResolvedValue(undefined)
    transactionMock.mockImplementation(async (fn: (tx: ReturnType<typeof makeTx>) => Promise<unknown>) => {
      return fn(makeTx())
    })
  })

  afterEach(() => {
    expect(selectQueue).toHaveLength(0)
    selectMock.mockReset()
  })

  test("createCategory rejects duplicate names case-insensitively", async () => {
    mockSession("user-1")
    enqueueSelect([
      {
        id: "cat-1",
        userId: "user-1",
        name: "React",
        color: null,
        icon: null,
        createdAt: null,
        updatedAt: null,
      },
    ])

    const result = await createCategory({ name: "react" })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBe("Tag already exists.")
    }
    expect(transactionMock).toHaveBeenCalledTimes(1)
    expect(insertMock).not.toHaveBeenCalled()
    expect(revalidatePathMock).not.toHaveBeenCalled()
  })

  test("createCategory inserts inside a transaction when name is new", async () => {
    mockSession("user-1")
    enqueueSelect([])

    const result = await createCategory({ name: "Fresh" })

    expect(result.ok).toBe(true)
    expect(transactionMock).toHaveBeenCalledTimes(1)
    expect(insertMock).toHaveBeenCalled()
    expect(insertValuesMock).toHaveBeenCalled()
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard")
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard/tags")
  })

  test("renameCategory updates owned category name", async () => {
    mockSession("user-1")
    enqueueSelect([
      {
        id: "cat-1",
        userId: "user-1",
        name: "Old",
        color: null,
        icon: null,
        createdAt: null,
        updatedAt: null,
      },
    ])
    enqueueSelect([])

    const result = await renameCategory({ categoryId: "cat-1", newName: "TypeScript" })

    expect(result.ok).toBe(true)
    expect(transactionMock).toHaveBeenCalledTimes(1)
    expect(updateMock).toHaveBeenCalled()
    expect(updateSetMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: "TypeScript" }),
    )
    expect(updateWhereMock).toHaveBeenCalled()
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard")
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard/tags")
  })

  test("deleteCategory removes associations and category + returns detached count", async () => {
    mockSession("user-1")
    enqueueSelect([
      {
        id: "cat-1",
        userId: "user-1",
        name: "Zap",
        color: null,
        icon: null,
        createdAt: null,
        updatedAt: null,
      },
    ])
    enqueueSelect([{ count: 7 }], "whereEnd")

    const result = await deleteCategory({ categoryId: "cat-1" })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.detachedLinks).toBe(7)
    }
    expect(transactionMock).toHaveBeenCalledTimes(1)
    expect(deleteWhereMock).toHaveBeenCalledTimes(2)
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard")
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard/tags")
  })

  test("getCategoryDeletePreview returns active (non-archived) usage count for owned links", async () => {
    mockSession("user-1")
    enqueueSelect([
      {
        id: "cat-1",
        userId: "user-1",
        name: "Docs",
        color: null,
        icon: null,
        createdAt: null,
        updatedAt: null,
      },
    ])
    enqueueSelect([{ count: 12 }], "whereEnd")

    const result = await getCategoryDeletePreview({ categoryId: "cat-1" })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.usageCount).toBe(12)
    }
    expect(deleteMock).not.toHaveBeenCalled()
    expect(revalidatePathMock).not.toHaveBeenCalled()
  })
})
