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

function openTagActionsMenu() {
  const trigger = screen.getByRole("button", { name: /actions for tag react/i })
  // Radix DropdownMenuTrigger toggles on pointerdown, not click (jsdom click lacks pointer events).
  fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false })
}

test("tag actions menu lists Rename and Delete", async () => {
  renderCategoryRow()

  openTagActionsMenu()

  await waitFor(() => {
    expect(screen.getByRole("menuitem", { name: /^rename$/i })).toBeInTheDocument()
    expect(screen.getByRole("menuitem", { name: /^delete$/i })).toBeInTheDocument()
  })
})

test("delete flow shows usage count from getCategoryDeletePreview", async () => {
  vi.mocked(getCategoryDeletePreview).mockResolvedValue({ ok: true, usageCount: 7 })

  renderCategoryRow()

  openTagActionsMenu()
  await waitFor(() => {
    expect(screen.getByRole("menuitem", { name: /^delete$/i })).toBeInTheDocument()
  })

  fireEvent.click(screen.getByRole("menuitem", { name: /^delete$/i }))

  const dialog = await screen.findByRole("dialog")
  await waitFor(() => {
    expect(within(dialog).getByText(/7 links/i)).toBeInTheDocument()
  })
})

describe("TagsManagement", () => {
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
