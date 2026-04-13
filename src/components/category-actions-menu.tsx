"use client"

import {
  deleteCategory,
  getCategoryDeletePreview,
  renameCategory,
} from "@/actions/manageCategories"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { SidebarMenuAction } from "@/components/ui/sidebar"
import { Loader2, MoreHorizontal } from "lucide-react"
import { useRouter } from "next/navigation"
import {
  type ComponentPropsWithoutRef,
  forwardRef,
  useCallback,
  useEffect,
  useState,
} from "react"
import { toast } from "sonner"

interface CategoryActionsMenuProps {
  categoryId: string
  categoryName: string
  /** Sidebar row (default) or table/actions column */
  triggerVariant?: "sidebar" | "inline"
}

function usageDescription(count: number): string {
  const base =
    "Deleting removes this tag from all links, including archived ones."
  const usageSuffix = " (same count as the Usage column on Tags)."
  if (count === 0) {
    return `${base} It is not used on any active links right now${usageSuffix}`
  }
  if (count === 1) {
    return `${base} It is used on 1 active link${usageSuffix}`
  }
  return `${base} It is used on ${count} active links${usageSuffix}`
}

const categoryMenuTriggerIcon = (
  <>
    <MoreHorizontal className="size-4" />
    <span className="sr-only">Open tag actions</span>
  </>
)

const CategoryMenuTrigger = forwardRef<
  HTMLButtonElement,
  { variant: "sidebar" | "inline"; categoryName: string } & ComponentPropsWithoutRef<"button">
>(function CategoryMenuTrigger({ variant, categoryName, ...rest }, ref) {
  const label = `Actions for tag ${categoryName}`
  if (variant === "sidebar") {
    return (
      <SidebarMenuAction
        ref={ref}
        className="data-[state=open]:bg-sidebar-accent"
        aria-label={label}
        {...rest}
      >
        {categoryMenuTriggerIcon}
      </SidebarMenuAction>
    )
  }
  return (
    <Button
      ref={ref}
      type="button"
      variant="ghost"
      size="icon"
      className="size-8 shrink-0"
      aria-label={label}
      {...rest}
    >
      {categoryMenuTriggerIcon}
    </Button>
  )
})
CategoryMenuTrigger.displayName = "CategoryMenuTrigger"

function DeleteTagDialogDescription({
  previewError,
  usageCount,
}: {
  previewError: string | null
  usageCount: number | null
}) {
  if (previewError) {
    return previewError
  }
  if (usageCount === null) {
    return (
      <span className="inline-flex items-center gap-2">
        <Loader2 className="size-4 animate-spin shrink-0" />
        Loading usage…
      </span>
    )
  }
  return (
    <>
      {usageDescription(usageCount)} This cannot be undone.
    </>
  )
}

function useCategoryActions(categoryId: string, categoryName: string) {
  const router = useRouter()
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [renameValue, setRenameValue] = useState(categoryName)
  const [usageCount, setUsageCount] = useState<number | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [isRenaming, setIsRenaming] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (!renameOpen) return
    setRenameValue(categoryName)
  }, [renameOpen, categoryName])

  useEffect(() => {
    if (!deleteOpen) {
      setUsageCount(null)
      setPreviewError(null)
      return
    }
    let cancelled = false
    void (async () => {
      const result = await getCategoryDeletePreview({ categoryId })
      if (cancelled) return
      if (result.ok) {
        setUsageCount(result.usageCount)
        setPreviewError(null)
      } else {
        setPreviewError(result.error)
        setUsageCount(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [deleteOpen, categoryId])

  const syncUrlAfterCategoryNameChange = (nextName: string | null) => {
    const params = new URLSearchParams(
      typeof window !== "undefined" ? window.location.search : "",
    )
    if (params.get("category") !== categoryName) {
      return
    }
    if (nextName === null) {
      params.delete("category")
    } else {
      params.set("category", nextName)
    }
    const qs = params.toString()
    router.push(`/dashboard${qs ? `?${qs}` : ""}`)
  }

  const handleRename = () => {
    const trimmed = renameValue.trim()
    if (!trimmed) {
      toast.error("Tag name is required.")
      return
    }
    if (isRenaming) return
    setIsRenaming(true)
    void (async () => {
      try {
        const result = await renameCategory({ categoryId, newName: trimmed })
        if (!result.ok) {
          toast.error(result.error)
          return
        }
        toast.success("Tag renamed.")
        setRenameOpen(false)
        syncUrlAfterCategoryNameChange(trimmed)
        router.refresh()
      } finally {
        setIsRenaming(false)
      }
    })()
  }

  const handleDelete = () => {
    if (isDeleting) return
    setIsDeleting(true)
    void (async () => {
      try {
        const result = await deleteCategory({ categoryId })
        if (!result.ok) {
          toast.error(result.error)
          return
        }
        toast.success(
          result.detachedLinks > 0
            ? `Tag deleted. Removed from ${result.detachedLinks} active link${result.detachedLinks === 1 ? "" : "s"}.`
            : "Tag deleted.",
        )
        setDeleteOpen(false)
        syncUrlAfterCategoryNameChange(null)
        router.refresh()
      } finally {
        setIsDeleting(false)
      }
    })()
  }

  const deleteConfirmDisabled =
    isDeleting || previewError !== null || usageCount === null

  const openRename = useCallback(() => {
    setRenameValue(categoryName)
    setRenameOpen(true)
  }, [categoryName])

  return {
    renameOpen,
    setRenameOpen,
    deleteOpen,
    setDeleteOpen,
    renameValue,
    setRenameValue,
    usageCount,
    previewError,
    isRenaming,
    isDeleting,
    deleteConfirmDisabled,
    handleRename,
    handleDelete,
    openRename,
  }
}

export function CategoryActionsMenu({
  categoryId,
  categoryName,
  triggerVariant = "sidebar",
}: CategoryActionsMenuProps) {
  const {
    renameOpen,
    setRenameOpen,
    deleteOpen,
    setDeleteOpen,
    renameValue,
    setRenameValue,
    usageCount,
    previewError,
    isRenaming,
    isDeleting,
    deleteConfirmDisabled,
    handleRename,
    handleDelete,
    openRename,
  } = useCategoryActions(categoryId, categoryName)

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <CategoryMenuTrigger variant={triggerVariant} categoryName={categoryName} />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side={triggerVariant === "sidebar" ? "right" : "bottom"}
          align="end"
          className="w-40"
        >
          <DropdownMenuItem onSelect={openRename}>Rename</DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => setDeleteOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>Rename tag</DialogTitle>
            <DialogDescription>Choose a new name for this tag.</DialogDescription>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                handleRename()
              }
            }}
            aria-label="New tag name"
            autoFocus
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleRename} disabled={isRenaming}>
              {isRenaming ? <Loader2 className="size-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>Delete tag</DialogTitle>
            <DialogDescription>
              <DeleteTagDialogDescription
                previewError={previewError}
                usageCount={usageCount}
              />
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteConfirmDisabled}
            >
              {isDeleting ? <Loader2 className="size-4 animate-spin" /> : "Delete tag"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
