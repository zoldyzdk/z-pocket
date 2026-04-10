"use client"

import { createCategory } from "@/actions/manageCategories"
import { CategoryActionsMenu } from "@/components/category-actions-menu"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Loader2, Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

export type TagWithUsage = {
  id: string
  name: string
  usageCount: number
}

interface TagsManagementProps {
  initialCategories: TagWithUsage[]
}

export function TagsManagement({ initialCategories }: TagsManagementProps) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  const handleCreate = () => {
    const trimmed = newName.trim()
    if (!trimmed) {
      toast.error("Tag name is required.")
      return
    }
    if (isCreating) return
    setIsCreating(true)
    void (async () => {
      try {
        const result = await createCategory({ name: trimmed })
        if (!result.ok) {
          toast.error(result.error)
          return
        }
        toast.success("Tag created.")
        setNewName("")
        setCreateOpen(false)
        router.refresh()
      } finally {
        setIsCreating(false)
      }
    })()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tags</h1>
          <p className="text-muted-foreground text-sm">
            Create, rename, and delete tags. Usage counts exclude archived links.
          </p>
        </div>
        <Button type="button" onClick={() => setCreateOpen(true)} className="shrink-0 gap-2">
          <Plus className="size-4" />
          New tag
        </Button>
      </div>

      {initialCategories.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
          <p className="text-muted-foreground mb-1 font-medium">No tags yet</p>
          <p className="text-muted-foreground text-sm">Create a tag to organize your links.</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="w-[120px] text-right">Usage</TableHead>
                <TableHead className="w-[72px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialCategories.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.usageCount}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end">
                      <CategoryActionsMenu
                        categoryId={row.id}
                        categoryName={row.name}
                        triggerVariant="inline"
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open)
          if (!open) setNewName("")
        }}
      >
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>Create tag</DialogTitle>
            <DialogDescription>Add a new tag you can assign to links.</DialogDescription>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                handleCreate()
              }
            }}
            placeholder="Tag name"
            aria-label="New tag name"
            autoFocus
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleCreate} disabled={isCreating}>
              {isCreating ? <Loader2 className="size-4 animate-spin" /> : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
