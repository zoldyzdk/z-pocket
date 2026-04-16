import {
  createCategory,
  deleteCategory,
  getCategoryDeletePreview,
  renameCategory,
} from "@/actions/manageCategories"
import { CategoryMenuItem } from "@/components/category-menu-item"
import { TagsManagement } from "@/components/tags-management"
import { SidebarMenu, SidebarProvider } from "@/components/ui/sidebar"
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

beforeEach(() => {
  vi.mocked(renameCategory).mockResolvedValue({ ok: true })
  vi.mocked(deleteCategory).mockResolvedValue({ ok: true, detachedLinks: 0 })
  vi.mocked(getCategoryDeletePreview).mockResolvedValue({ ok: true, usageCount: 0 })
  vi.mocked(createCategory).mockResolvedValue({ ok: true })
})

function renderCategoryRow() {
  return render(
    <SidebarProvider defaultOpen>
      <SidebarMenu>
        <CategoryMenuItem category={{ id: "cat-1", name: "React" }} />
      </SidebarMenu>
    </SidebarProvider>,
  )
}

async function openTagActionsMenu(tagName: string) {
  const user = userEvent.setup()
  const trigger = screen.getByRole("button", {
    name: new RegExp(`actions for tag ${tagName}`, "i"),
  })
  await user.click(trigger)
}

test("tag actions menu lists Rename and Delete", async () => {
  renderCategoryRow()

  await openTagActionsMenu("React")

  await waitFor(() => {
    expect(screen.getByRole("menuitem", { name: /^rename$/i })).toBeInTheDocument()
    expect(screen.getByRole("menuitem", { name: /^delete$/i })).toBeInTheDocument()
  })
})

async function openDeleteDialogFromSidebar() {
  renderCategoryRow()
  await openTagActionsMenu("React")
  await waitFor(() => {
    expect(screen.getByRole("menuitem", { name: /^delete$/i })).toBeInTheDocument()
  })
  fireEvent.click(screen.getByRole("menuitem", { name: /^delete$/i }))
  return screen.findByRole("dialog")
}

test("delete flow fetches preview via getCategoryDeletePreview and shows usage count before confirm", async () => {
  vi.mocked(getCategoryDeletePreview).mockResolvedValue({ ok: true, usageCount: 7 })

  const dialog = await openDeleteDialogFromSidebar()

  await waitFor(() => {
    expect(getCategoryDeletePreview).toHaveBeenCalledWith({ categoryId: "cat-1" })
  })
  expect(
    within(dialog).getByText(/deleting removes this tag from all links, including archived ones/i),
  ).toBeInTheDocument()
  expect(within(dialog).getByText(/used on 7 active links/i)).toBeInTheDocument()
  expect(within(dialog).getByText(/same count as the usage column on tags/i)).toBeInTheDocument()
  expect(within(dialog).getByText(/cannot be undone/i)).toBeInTheDocument()
})

test("delete confirm calls deleteCategory with category id", async () => {
  vi.mocked(getCategoryDeletePreview).mockResolvedValue({ ok: true, usageCount: 2 })

  const dialog = await openDeleteDialogFromSidebar()
  await waitFor(() => {
    expect(within(dialog).getByRole("button", { name: /^delete tag$/i })).not.toBeDisabled()
  })

  fireEvent.click(within(dialog).getByRole("button", { name: /^delete tag$/i }))

  await waitFor(() => {
    expect(deleteCategory).toHaveBeenCalledWith({ categoryId: "cat-1" })
  })
})

test("delete dialog copy for zero and singular usage", async () => {
  vi.mocked(getCategoryDeletePreview).mockResolvedValue({ ok: true, usageCount: 0 })
  let dialog = await openDeleteDialogFromSidebar()
  await waitFor(() => {
    expect(
      within(dialog).getByText(/deleting removes this tag from all links, including archived ones/i),
    ).toBeInTheDocument()
    expect(within(dialog).getByText(/not used on any active links right now/i)).toBeInTheDocument()
    expect(within(dialog).getByText(/same count as the usage column on tags/i)).toBeInTheDocument()
  })

  cleanup()
  vi.clearAllMocks()
  vi.mocked(renameCategory).mockResolvedValue({ ok: true })
  vi.mocked(deleteCategory).mockResolvedValue({ ok: true, detachedLinks: 0 })
  vi.mocked(getCategoryDeletePreview).mockResolvedValue({ ok: true, usageCount: 1 })
  vi.mocked(createCategory).mockResolvedValue({ ok: true })

  dialog = await openDeleteDialogFromSidebar()
  await waitFor(() => {
    expect(
      within(dialog).getByText(/deleting removes this tag from all links, including archived ones/i),
    ).toBeInTheDocument()
    expect(within(dialog).getByText(/used on 1 active link/i)).toBeInTheDocument()
    expect(within(dialog).getByText(/same count as the usage column on tags/i)).toBeInTheDocument()
    expect(within(dialog).queryByText(/1 active links/i)).not.toBeInTheDocument()
  })
})

test("delete confirm stays disabled when preview fails", async () => {
  vi.mocked(getCategoryDeletePreview).mockResolvedValue({ ok: false, error: "Tag not found." })

  const dialog = await openDeleteDialogFromSidebar()
  await waitFor(() => {
    expect(within(dialog).getByText(/tag not found/i)).toBeInTheDocument()
  })
  expect(within(dialog).getByRole("button", { name: /^delete tag$/i })).toBeDisabled()
  expect(deleteCategory).not.toHaveBeenCalled()
})

describe("TagsManagement", () => {
  test("inline actions delete flow uses getCategoryDeletePreview for that row id", async () => {
    vi.mocked(getCategoryDeletePreview).mockResolvedValue({ ok: true, usageCount: 3 })

    render(
      <TagsManagement initialCategories={[{ id: "row-cat", name: "Gamma", usageCount: 3 }]} />,
    )

    await openTagActionsMenu("Gamma")
    await waitFor(() => {
      expect(screen.getByRole("menuitem", { name: /^delete$/i })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole("menuitem", { name: /^delete$/i }))

    const dialog = await screen.findByRole("dialog")
    await waitFor(() => {
      expect(getCategoryDeletePreview).toHaveBeenCalledWith({ categoryId: "row-cat" })
    })
    expect(
      within(dialog).getByText(/deleting removes this tag from all links, including archived ones/i),
    ).toBeInTheDocument()
    expect(within(dialog).getByText(/used on 3 active links/i)).toBeInTheDocument()
    expect(within(dialog).getByText(/same count as the usage column on tags/i)).toBeInTheDocument()
  })

  test("renders tags with usage counts in alphabetical row order", () => {
    render(
      <TagsManagement
        initialCategories={[
          { id: "z", name: "Zeta", usageCount: 1 },
          { id: "a", name: "Alpha", usageCount: 0 },
          { id: "b", name: "Beta", usageCount: 12 },
        ]}
      />,
    )

    expect(screen.getByRole("columnheader", { name: /^name$/i })).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: /^usage$/i })).toBeInTheDocument()

    const dataRows = screen.getAllByRole("row").slice(1)
    expect(dataRows.map((row) => within(row).getAllByRole("cell")[0].textContent)).toEqual([
      "Alpha",
      "Beta",
      "Zeta",
    ])

    const alphaRow = screen.getByRole("row", { name: /alpha/i })
    expect(within(alphaRow).getByText("Alpha")).toBeInTheDocument()
    expect(within(alphaRow).getByText("0")).toBeInTheDocument()

    const betaRow = screen.getByRole("row", { name: /beta/i })
    expect(within(betaRow).getByText("Beta")).toBeInTheDocument()
    expect(within(betaRow).getByText("12")).toBeInTheDocument()

    const zetaRow = screen.getByRole("row", { name: /zeta/i })
    expect(within(zetaRow).getByText("Zeta")).toBeInTheDocument()
    expect(within(zetaRow).getByText("1")).toBeInTheDocument()
  })

  test("shows empty state when there are no tags", () => {
    render(<TagsManagement initialCategories={[]} />)

    expect(screen.getByText(/no tags yet/i)).toBeInTheDocument()
    expect(screen.queryByRole("columnheader", { name: /^name$/i })).not.toBeInTheDocument()
  })
})
