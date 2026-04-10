import {
  deleteCategory,
  getCategoryDeletePreview,
  renameCategory,
} from "@/actions/manageCategories"
import { CategoryMenuItem } from "@/components/category-menu-item"
import { SidebarMenu, SidebarProvider } from "@/components/ui/sidebar"
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

beforeEach(() => {
  vi.mocked(renameCategory).mockResolvedValue({ ok: true })
  vi.mocked(deleteCategory).mockResolvedValue({ ok: true, detachedLinks: 0 })
  vi.mocked(getCategoryDeletePreview).mockResolvedValue({ ok: true, usageCount: 0 })
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
