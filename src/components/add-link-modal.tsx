"use client"

import { useState } from "react"
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
import { Bookmark, LinkIcon, PlusIcon, Tag } from "lucide-react"
import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { addLink } from "@/actions/addLink"

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
  tags: z
    .string()
    .max(100, "Tags must be less than 100 characters")
    .optional(),
})

type LinkFormData = z.infer<typeof linkSchema>

export function AddLinkModal() {
  const [open, setOpen] = useState(false)

  const form = useForm<LinkFormData>({
    resolver: zodResolver(linkSchema),
    defaultValues: {
      url: "",
      title: "",
      description: "",
      tags: "",
    },
  })

  const onSubmit = async (data: LinkFormData) => {
    try {
      const result = await addLink(data)

      if (result.success) {
        toast.success(result.message)
        form.reset()
        setOpen(false)
      } else {
        toast.error("Failed to save link. Please try again.")
      }
    } catch (error) {
      console.error("Error saving link:", error)
      toast.error(error instanceof Error ? error.message : "Failed to save link. Please try again.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants({ variant: "default" })}>
        <PlusIcon />
        Add Link
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bookmark />
            Save for later
          </DialogTitle>
          <DialogDescription>
            Add a link to your reading list. We'll save it for you to read anytime.
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
                    <Input
                      placeholder="https://example.com/article"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Tags
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="tag1, tag2, tag3 (optional)"
                      {...field}
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
                {form.formState.isSubmitting ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
