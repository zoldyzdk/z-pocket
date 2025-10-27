"use client"

import { addLink } from "@/actions/addLink"
import { updateLink } from "@/actions/updateLink"
import { fetchMetadata } from "@/actions/fetchMetadata"
import { getCategories } from "@/actions/getCategories"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { TagInput } from "@/components/ui/tag-input"
import { zodResolver } from "@hookform/resolvers/zod"
import { Bookmark, LinkIcon, Loader2, PlusIcon, Search, Tag } from "lucide-react"
import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

const linkSchema = z.object({
  url: z
    .url("Please enter a valid URL")
    .min(1, "URL is required"),
  title: z
    .string()
    .max(200, "Title must be less than 200 characters")
    .optional(),
  description: z
    .string()
    .max(500, "Description must be less than 500 characters")
    .optional(),
  imageUrl: z
    .url("Please enter a valid image URL")
    .optional()
    .or(z.literal("")),
  categories: z
    .array(z.string())
    .optional(),
})

type LinkFormData = z.infer<typeof linkSchema>

interface AddLinkModalProps {
  linkId?: string
  initialData?: {
    url: string
    title?: string | null
    description?: string | null
    imageUrl?: string | null
    categories?: string[]
  }
  trigger?: React.ReactNode
}

export function AddLinkModal({ linkId, initialData, trigger }: AddLinkModalProps) {
  const [open, setOpen] = useState(false)
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false)
  const [metadataPreview, setMetadataPreview] = useState<{
    title?: string
    description?: string
    imageUrl?: string
  } | null>(null)
  const [categorySuggestions, setCategorySuggestions] = useState<string[]>([])
  const isEditMode = !!linkId

  const form = useForm<LinkFormData>({
    resolver: zodResolver(linkSchema),
    defaultValues: initialData ? {
      url: initialData.url || "",
      title: initialData.title || "",
      description: initialData.description || "",
      imageUrl: initialData.imageUrl || "",
      categories: initialData.categories || [],
    } : {
      url: "",
      title: "",
      description: "",
      imageUrl: "",
      categories: [],
    },
  })

  // Fetch categories only when modal is opened
  useEffect(() => {
    if (open) {
      const fetchCategorySuggestions = async () => {
        try {
          const categories = await getCategories()
          setCategorySuggestions(categories)
        } catch (error) {
          console.error("Error fetching categories:", error)
        }
      }

      fetchCategorySuggestions()
    }
  }, [open])

  const fetchMetadataFromUrl = async (url: string) => {
    if (!url) return

    setIsFetchingMetadata(true)
    setMetadataPreview(null)

    try {
      const metadata = await fetchMetadata(url)

      if (metadata.error) {
        toast.error(`Failed to fetch metadata: ${metadata.error}`)
        return
      }

      if (metadata.title || metadata.description || metadata.imageUrl) {
        setMetadataPreview(metadata)

        // Pre-fill form fields with fetched data
        if (metadata.title && !form.getValues("title")) {
          form.setValue("title", metadata.title)
        }
        if (metadata.description && !form.getValues("description")) {
          form.setValue("description", metadata.description)
        }
        if (metadata.imageUrl && !form.getValues("imageUrl")) {
          form.setValue("imageUrl", metadata.imageUrl)
        }

        toast.success("Metadata fetched successfully!")
      } else {
        toast.info("No metadata found for this URL")
      }
    } catch (error) {
      console.error("Error fetching metadata:", error)
      toast.error("Failed to fetch metadata. Please try again.")
    } finally {
      setIsFetchingMetadata(false)
    }
  }

  const onSubmit = async (data: LinkFormData) => {
    try {
      let result

      if (isEditMode && linkId) {
        result = await updateLink(linkId, data)
      } else {
        result = await addLink(data)
      }

      if (result.success) {
        toast.success(result.message)
        if (!isEditMode) {
          form.reset()
        }
        setMetadataPreview(null)
        setOpen(false)
      } else {
        toast.error(`Failed to ${isEditMode ? 'update' : 'save'} link. Please try again.`)
      }
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'saving'} link:`, error)
      toast.error(error instanceof Error ? error.message : `Failed to ${isEditMode ? 'update' : 'save'} link. Please try again.`)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)

    // Clean up when closing
    if (!newOpen) {
      // Reset metadata preview
      setMetadataPreview(null)

      // Reset form to initial values
      if (isEditMode && initialData) {
        form.reset({
          url: initialData.url || "",
          title: initialData.title || "",
          description: initialData.description || "",
          imageUrl: initialData.imageUrl || "",
          categories: initialData.categories || [],
        })
      } else {
        form.reset({
          url: "",
          title: "",
          description: "",
          imageUrl: "",
          categories: [],
        })
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <button className={buttonVariants({ variant: "outline", size: "icon" })}>
            <PlusIcon />
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bookmark />
            {isEditMode ? 'Edit link' : 'Save for later'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update the link details below.'
              : "Add a link to your reading list. We'll save it for you to read anytime."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <LinkIcon className="h-4 w-4" />
                    URL *
                  </FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <Input
                        placeholder="https://example.com/article"
                        {...field}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => fetchMetadataFromUrl(field.value)}
                        disabled={isFetchingMetadata || !field.value}
                      >
                        {isFetchingMetadata ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Search className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Metadata Preview */}
            {metadataPreview && (
              <div className="rounded-lg border bg-muted/50 p-4">
                <h4 className="text-sm font-medium mb-3">Preview</h4>
                <div className="flex gap-3 items-center">
                  {metadataPreview.imageUrl && (
                    <div className="relative w-16 rounded overflow-hidden bg-muted flex-shrink-0">
                      <img
                        src={metadataPreview.imageUrl}
                        alt="Preview"
                        className="object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    {metadataPreview.title && (
                      <p className="text-sm font-medium line-clamp-2 mb-1">
                        {metadataPreview.title}
                      </p>
                    )}
                    {metadataPreview.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {metadataPreview.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Article title (optional)"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description (optional)"
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://example.com/image.jpg (optional)"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="categories"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Categories
                  </FormLabel>
                  <FormControl>
                    <TagInput
                      value={field.value || []}
                      onChange={field.onChange}
                      suggestions={categorySuggestions}
                      placeholder="Add categories..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? (isEditMode ? "Updating..." : "Saving...")
                  : (isEditMode ? "Update" : "Save")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
