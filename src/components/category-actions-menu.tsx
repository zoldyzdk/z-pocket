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
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"

interface CategoryActionsMenuProps {
  categoryId: string
  categoryName: string
  /** Sidebar row (default) or table/actions column */
  triggerVariant?: "sidebar" | "inline"
}

function usageDescription(count: number): string {
  if (count === 0) {
    return "This tag is not used on any active links (same as the Usage column on Tags)."
  }
  if (count === 1) {
    return "This tag is used on 1 active link (same as the Usage column on Tags)."
  }
  return `This tag is used on ${count} active links (same as the Usage column on Tags).`
}

export function CategoryActionsMenu({
  categoryId,
  categoryName,
  triggerVariant = "sidebar",
}: CategoryActionsMenuProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [renameValue, setRenameValue] = useState(categoryName)
  const [usageCount, setUsageCount] = useState<number | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [isRenaming, setIsRenaming] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (renameOpen) {
      setRenameValue(categoryName)
    }
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
    const params = new URLSearchParams(searchParams.toString())
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

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          {triggerVariant === "sidebar" ? (
            <SidebarMenuAction
              className="data-[state=open]:bg-sidebar-accent"
              aria-label={`Actions for tag ${categoryName}`}
            >
              <MoreHorizontal className="size-4" />
              <span className="sr-only">Open tag actions</span>
            </SidebarMenuAction>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              aria-label={`Actions for tag ${categoryName}`}
            >
              <MoreHorizontal className="size-4" />
              <span className="sr-only">Open tag actions</span>
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side={triggerVariant === "sidebar" ? "right" : "bottom"}
          align="end"
          className="w-40"
        >
          <DropdownMenuItem onSelect={() => setRenameOpen(true)}>Rename</DropdownMenuItem>
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
              {previewError ? (
                previewError
              ) : usageCount === null ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin shrink-0" />
                  Loading usage…
                </span>
              ) : (
                <>
                  {usageDescription(usageCount)} This cannot be undone.
                </>
              )}
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
              disabled={isDeleting || previewError !== null || usageCount === null}
            >
              {isDeleting ? <Loader2 className="size-4 animate-spin" /> : "Delete tag"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
