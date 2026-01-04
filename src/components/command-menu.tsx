"use client"

import { useState, useEffect } from "react"
import { Plus } from "lucide-react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { AddLinkModal } from "@/components/add-link-modal"

export function CommandMenu() {
  const [open, setOpen] = useState(false)
  const [addLinkModalOpen, setAddLinkModalOpen] = useState(false)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const handleAddLink = () => {
    setOpen(false)
    setTimeout(() => {
      setAddLinkModalOpen(true)
    }, 100)
  }

  return (
    <>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Actions">
            <CommandItem onSelect={handleAddLink}>
              <Plus />
              <span>Add a link</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
      <AddLinkModal open={addLinkModalOpen} onOpenChange={setAddLinkModalOpen} />
    </>
  )
}
