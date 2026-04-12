import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

// vitest.setup.tsx mocks these as empty fns for component tests; use real implementations here.
vi.mock("@/actions/addLink", async () => await vi.importActual<typeof import("@/actions/addLink")>("@/actions/addLink"))
vi.mock("@/actions/updateLink", async () => await vi.importActual<typeof import("@/actions/updateLink")>("@/actions/updateLink"))

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

vi.mock("nanoid", () => ({
  nanoid: vi.fn(() => "mock-nanoid"),
}))

const { selectMock, insertMock, insertValuesMock, updateMock, updateSetMock, updateWhereMock, deleteMock, deleteWhereMock } =
  vi.hoisted(() => {
    const insertValuesMockInner = vi.fn().mockResolvedValue(undefined)
    const insertMockInner = vi.fn().mockReturnValue({ values: insertValuesMockInner })
    const selectMockInner = vi.fn()
    const updateSetMockInner = vi.fn().mockReturnThis()
    const updateWhereMockInner = vi.fn().mockResolvedValue(undefined)
    const updateMockInner = vi.fn().mockReturnValue({
      set: updateSetMockInner,
      where: updateWhereMockInner,
    })
    const deleteWhereMockInner = vi.fn().mockResolvedValue(undefined)
    const deleteMockInner = vi.fn().mockReturnValue({ where: deleteWhereMockInner })

    return {
      selectMock: selectMockInner,
      insertMock: insertMockInner,
      insertValuesMock: insertValuesMockInner,
      updateMock: updateMockInner,
      updateSetMock: updateSetMockInner,
      updateWhereMock: updateWhereMockInner,
      deleteMock: deleteMockInner,
      deleteWhereMock: deleteWhereMockInner,
    }
  })

const selectQueue: unknown[][] = []

function enqueueSelect(rows: unknown[]) {
  selectQueue.push(rows)
}

function setupSelectMockFromQueue() {
  selectMock.mockImplementation(() => {
    const rows = selectQueue.shift()
    if (!rows) {
      throw new Error("selectMock: no queued result")
    }
    const promise = Promise.resolve(rows)
    return {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnValue(promise),
    }
  })
}

function isCategoryInsert(value: unknown): value is { name: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    typeof (value as { name: unknown }).name === "string" &&
    !("url" in value)
  )
}

vi.mock("@/db", () => ({
  db: {
    get select() {
      return selectMock
    },
    insert: insertMock,
    update: updateMock,
    delete: deleteMock,
  },
}))

import { addLink } from "@/actions/addLink"
import { updateLink } from "@/actions/updateLink"

function mockSession(userId: string | null) {
  getSessionMock.mockResolvedValue(userId ? { user: { id: userId } } : null)
}

const existingCategoryRow = {
  id: "cat-existing",
  userId: "user-1",
  name: "TypeScript",
  color: null,
  icon: null,
  createdAt: null,
  updatedAt: null,
}

const existingLinkRow = {
  id: "link-1",
  userId: "user-1",
  url: "https://example.com",
  title: null,
  description: null,
  imageUrl: null,
  type: null,
  estimatedReadingTime: null,
  wordCount: null,
  isArchived: false,
  archivedAt: null,
  createdAt: null,
  updatedAt: null,
}

describe("addLink category matching", () => {
  beforeEach(() => {
    selectQueue.length = 0
    vi.clearAllMocks()
    setupSelectMockFromQueue()
    insertValuesMock.mockResolvedValue(undefined)
  })

  afterEach(() => {
    expect(selectQueue).toHaveLength(0)
    selectMock.mockReset()
  })

  test("reuses existing category when input casing differs", async () => {
    mockSession("user-1")
    enqueueSelect([existingCategoryRow])

    const result = await addLink({
      url: "https://docs.example.com",
      categories: ["typescript"],
    })
    expect(result.success).toBe(true)

    const categoryInserts = insertValuesMock.mock.calls.map((c) => c[0]).filter(isCategoryInsert)
    expect(categoryInserts).toHaveLength(0)

    const linkCategoryInserts = insertValuesMock.mock.calls
      .map((c) => c[0])
      .filter((v) => typeof v === "object" && v !== null && "linkId" in v && "categoryId" in v)
    expect(linkCategoryInserts).toContainEqual(
      expect.objectContaining({
        linkId: "mock-nanoid",
        categoryId: "cat-existing",
      }),
    )

    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard")
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard/tags")
  })
})

describe("updateLink category matching", () => {
  beforeEach(() => {
    selectQueue.length = 0
    vi.clearAllMocks()
    setupSelectMockFromQueue()
    insertValuesMock.mockResolvedValue(undefined)
    updateWhereMock.mockResolvedValue(undefined)
    deleteWhereMock.mockResolvedValue(undefined)
  })

  afterEach(() => {
    expect(selectQueue).toHaveLength(0)
    selectMock.mockReset()
  })

  test("reuses existing category when input casing differs", async () => {
    mockSession("user-1")
    enqueueSelect([existingLinkRow])
    enqueueSelect([existingCategoryRow])

    await updateLink("link-1", {
      url: "https://example.com/updated",
      categories: ["TYPESCRIPT"],
    })

    expect(updateMock).toHaveBeenCalled()
    expect(deleteWhereMock).toHaveBeenCalled()

    const categoryInserts = insertValuesMock.mock.calls.map((c) => c[0]).filter(isCategoryInsert)
    expect(categoryInserts).toHaveLength(0)

    expect(insertValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        linkId: "link-1",
        categoryId: "cat-existing",
      }),
    )

    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard")
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard/tags")
  })
})
