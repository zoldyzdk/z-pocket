"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { CategoryActionsMenu } from "@/components/category-actions-menu"
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

interface CategoryMenuItemProps {
  category: { id: string; name: string }
}

export function CategoryMenuItem({ category }: CategoryMenuItemProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentCategory = searchParams.get("category")
  const isActive =
    pathname === "/dashboard" && currentCategory === category.name

  const handleClick = () => {
    const params = new URLSearchParams(searchParams)

    if (isActive) {
      // If already active, clear the category filter
      params.delete("category")
    } else {
      // Set the category filter
      params.set("category", category.name)
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
          isActive && "bg-accent font-medium",
        )}
      >
        <span>{category.name}</span>
      </SidebarMenuButton>
      <CategoryActionsMenu categoryId={category.id} categoryName={category.name} />
    </SidebarMenuItem>
  )
}

