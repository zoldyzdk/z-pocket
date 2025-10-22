"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Check, X } from "lucide-react"
import { useState, KeyboardEvent } from "react"

interface TagInputProps {
    value: string[]
    onChange: (value: string[]) => void
    suggestions?: string[]
    placeholder?: string
    className?: string
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

    const addTag = (tag: string) => {
        const normalizedTag = tag.trim()
        if (normalizedTag && !value.includes(normalizedTag)) {
            onChange([...value, normalizedTag])
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

    // Filter suggestions to exclude already selected tags
    const availableSuggestions = suggestions.filter(
        (suggestion) => !value.includes(suggestion)
    )

    // Check if input matches any suggestion
    const exactMatch = availableSuggestions.some(
        (s) => s.toLowerCase() === inputValue.toLowerCase()
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

            {/* Input with autocomplete */}
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
                <PopoverContent className="w-full p-0" align="start">
                    <Command shouldFilter={false}>
                        <CommandInput
                            placeholder="Search or create..."
                            value={inputValue}
                            onValueChange={setInputValue}
                            onKeyDown={handleKeyDown}
                        />
                        <CommandList>
                            {availableSuggestions.length === 0 && !inputValue && (
                                <CommandEmpty>No categories yet.</CommandEmpty>
                            )}
                            {availableSuggestions.length === 0 && inputValue && (
                                <CommandEmpty>
                                    Press Enter to create &quot;{inputValue}&quot;
                                </CommandEmpty>
                            )}
                            {availableSuggestions.length > 0 && (
                                <CommandGroup>
                                    {availableSuggestions
                                        .filter((suggestion) =>
                                            suggestion.toLowerCase().includes(inputValue.toLowerCase())
                                        )
                                        .map((suggestion) => (
                                            <CommandItem
                                                key={suggestion}
                                                value={suggestion}
                                                onSelect={() => addTag(suggestion)}
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        value.includes(suggestion)
                                                            ? "opacity-100"
                                                            : "opacity-0"
                                                    )}
                                                />
                                                {suggestion}
                                            </CommandItem>
                                        ))}
                                </CommandGroup>
                            )}
                            {inputValue &&
                                !exactMatch &&
                                availableSuggestions.some((s) =>
                                    s.toLowerCase().includes(inputValue.toLowerCase())
                                ) && (
                                    <CommandGroup>
                                        <CommandItem
                                            value={inputValue}
                                            onSelect={() => addTag(inputValue)}
                                            className="text-primary"
                                        >
                                            Create &quot;{inputValue}&quot;
                                        </CommandItem>
                                    </CommandGroup>
                                )}
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    )
}

