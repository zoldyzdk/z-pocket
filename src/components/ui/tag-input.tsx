"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { normalizeCategoryName } from "@/lib/categories"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"
import { useEffect, useState, KeyboardEvent } from "react"

interface TagInputProps {
  value: string[]
  onChange: (value: string[]) => void
  suggestions?: string[]
  placeholder?: string
  className?: string
}

const DIALOG_MEDIA_QUERY = "(pointer: coarse), (hover: none), (max-width: 640px)"

type LegacyMediaQueryList = MediaQueryList & {
  addListener?: (listener: () => void) => void
  removeListener?: (listener: () => void) => void
}

function useTagInputDialogMode() {
  const [useDialog, setUseDialog] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return

    const mediaQuery = window.matchMedia(DIALOG_MEDIA_QUERY)
    const update = () => setUseDialog(mediaQuery.matches)

    update()

    if ("addEventListener" in mediaQuery) {
      mediaQuery.addEventListener("change", update)
      return () => mediaQuery.removeEventListener("change", update)
    }

    const legacyMediaQuery = mediaQuery as LegacyMediaQueryList
    legacyMediaQuery.addListener?.(update)

    return () => legacyMediaQuery.removeListener?.(update)
  }, [])

  return useDialog
}

export function TagInput({
  value = [],
  onChange,
  suggestions = [],
  placeholder = "Add tags...",
  className,
}: TagInputProps) {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const useDialog = useTagInputDialogMode()

  const addTag = (tag: string) => {
    const canonical = normalizeCategoryName(tag)
    const hasSelectedMatch = value.some(
      (selectedTag) => normalizeCategoryName(selectedTag) === canonical
    )

    if (canonical && !hasSelectedMatch) {
      onChange([...value, canonical])
    }
    setInputValue("")
    setOpen(false)
  }

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter((tag) => tag !== tagToRemove))
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault()
      addTag(inputValue)
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      e.preventDefault()
      removeTag(value[value.length - 1])
    }
  }

  const canonicalInput = normalizeCategoryName(inputValue)
  const selectedTagLookup = new Set(value.map((tag) => normalizeCategoryName(tag)))
  const filteredSuggestions: string[] = []
  let hasExactSuggestionMatch = false

  for (const suggestion of suggestions) {
    const normalizedSuggestion = normalizeCategoryName(suggestion)

    if (selectedTagLookup.has(normalizedSuggestion)) {
      continue
    }

    if (normalizedSuggestion === canonicalInput) {
      hasExactSuggestionMatch = true
    }

    if (canonicalInput === "" || normalizedSuggestion.includes(canonicalInput)) {
      filteredSuggestions.push(suggestion)
    }
  }

  const showCreateOption =
    canonicalInput.length > 0 && !selectedTagLookup.has(canonicalInput) && !hasExactSuggestionMatch

  const commandContent = (
    <>
      <CommandInput
        placeholder="Search or create..."
        value={inputValue}
        onValueChange={setInputValue}
        onKeyDown={handleKeyDown}
      />
      <CommandList className="max-h-60 overflow-y-auto">
        {filteredSuggestions.length === 0 && canonicalInput.length === 0 && (
          <CommandEmpty>No categories yet.</CommandEmpty>
        )}
        {filteredSuggestions.length === 0 && canonicalInput.length > 0 && (
          <CommandEmpty>Press Enter to create &quot;{canonicalInput}&quot;</CommandEmpty>
        )}
        {filteredSuggestions.length > 0 && (
          <CommandGroup>
            {filteredSuggestions.map((suggestion) => (
              <CommandItem key={suggestion} value={suggestion} onSelect={() => addTag(suggestion)}>
                {suggestion}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {showCreateOption ? (
          <CommandGroup>
            <CommandItem
              value={canonicalInput}
              onSelect={() => addTag(inputValue)}
              className="text-foreground"
            >
              Create &quot;{canonicalInput}&quot;
            </CommandItem>
          </CommandGroup>
        ) : null}
      </CommandList>
    </>
  )

  return (
    <div className={cn("space-y-2", className)}>
      {/* Display selected tags */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-1 hover:bg-muted rounded-full"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {useDialog ? (
        <>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-start text-left font-normal"
            onClick={() => setOpen(true)}
          >
            {placeholder}
          </Button>
          <CommandDialog
            open={open}
            onOpenChange={setOpen}
            title="Categories"
            description="Search or create categories"
            commandProps={{ shouldFilter: false }}
          >
            {commandContent}
          </CommandDialog>
        </>
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-start text-left font-normal"
            >
              {placeholder}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start" onWheel={(e) => e.stopPropagation()}>
            <Command shouldFilter={false}>{commandContent}</Command>
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}
