"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

interface CategoryMenuItemProps {
  categoryName: string
}

export function CategoryMenuItem({ categoryName }: CategoryMenuItemProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentCategory = searchParams.get("category")
  const isActive = currentCategory === categoryName

  const handleClick = () => {
    const params = new URLSearchParams(searchParams)

    if (isActive) {
      // If already active, clear the category filter
      params.delete("category")
    } else {
      // Set the category filter
      params.set("category", categoryName)
    }

    const newUrl = params.toString() ? `?${params.toString()}` : ""
    router.push(`/dashboard${newUrl}`)
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={handleClick}
        className={cn(
          "w-full justify-start cursor-pointer",
          isActive && "bg-accent font-medium"
        )}
      >
        <span>{categoryName}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

