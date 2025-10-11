"use client"

import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { MoreVertical, Tag } from "lucide-react"
import { cn } from "@/lib/utils"

interface ArticleCardProps {
  image: string
  title: string
  description: string
  tags?: string[]
  source?: string
  readTime?: string
  className?: string
}

export default function ArticleCard({
  image,
  title,
  description,
  tags = [],
  source,
  readTime,
  className,
}: ArticleCardProps) {
  return (
    <Card className={cn("group overflow-hidden pt-0 pb-4 shadow-sm transition-shadow hover:shadow-md max-w-[350px]", className)}>
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        <Image
          src={image || "/placeholder.svg"}
          alt={title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      <CardHeader className="">
        <CardTitle className="text-balance text-xl font-bold leading-tight">{title}</CardTitle>
        {(source || readTime) && (
          <CardDescription className="flex items-center gap-2">
            {source && <span>{source}</span>}
            {source && readTime && <span>·</span>}
            {readTime && <span>{readTime}</span>}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="">
        <p className="text-pretty text-sm leading-relaxed text-muted-foreground">{description}</p>
      </CardContent>

      <CardFooter className="justify-between pt-0">
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
        {/* TODO: transform this into a client component */}
        {/* {onMenuClick && (
        )} */}
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          <MoreVertical className="h-5 w-5" />
          <span className="sr-only">More options</span>
        </Button>
      </CardFooter>
    </Card>
  )
}
