"use client"

import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Edit, MoreVertical, PencilLine, Tag } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { AddLinkModal } from "@/components/add-link-modal"

interface LinkCardProps {
  linkId: string
  image?: string
  title: string
  description?: string
  tags?: string[]
  source?: string
  readTime?: string
  className?: string
}

function extractDomain(url: string): string {
  try {
    const domain = new URL(url).hostname
    return domain.replace('www.', '')
  } catch {
    return 'Unknown'
  }
}

export default function LinkCard({
  linkId,
  image,
  title,
  description,
  tags = [],
  source,
  readTime,
  className,
}: LinkCardProps) {
  return (
    <Card className={cn("group overflow-hidden pt-0 pb-4 shadow-sm transition-shadow hover:shadow-md max-w-[350px] flex flex-col", className)}>
      <Link href={source || ""} target="_blank">
        <div className="relative aspect-video w-full overflow-hidden bg-muted">
          <img
            src={image || "/no-image.jpg"}
            alt={title}
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      </Link>

      <CardHeader className="">
        <CardTitle className="text-balance text-xl font-bold leading-tight line-clamp-2 min-h-[2.5em]">{title}</CardTitle>
        <CardDescription className="flex items-center gap-2 min-h-[1.5em]">
          {source && <span>{extractDomain(source)}</span>}
          {source && readTime && <span>·</span>}
          {readTime && <span>{readTime}</span>}
        </CardDescription>
      </CardHeader>

      <CardContent className="">
        <p className="text-pretty text-sm leading-tight text-muted-foreground line-clamp-3">
          {description || '\u00A0'}
        </p>
      </CardContent>

      <CardFooter className="justify-between pt-0 mt-auto">
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="bg-pink-100 text-pink-700 hover:bg-pink-200 dark:bg-pink-950 dark:text-pink-300 dark:hover:bg-pink-900"
            >
              <Tag />
              {tag}
            </Badge>
          ))}
        </div>
        <Tooltip>
          <TooltipContent>
            Edit link
          </TooltipContent>
          <TooltipTrigger asChild>
            <AddLinkModal
              linkId={linkId}
              initialData={{
                url: source || "",
                title: title,
                description: description,
                imageUrl: image,
                categories: tags,
              }}
              trigger={
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                >
                  <PencilLine className="size-5" />
                </Button>
              }
            />
          </TooltipTrigger>
        </Tooltip>
      </CardFooter>
    </Card>
  )
}
