"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

export function AllCategoriesMenuItem() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const currentCategory = searchParams.get("category")
    const isActive = !currentCategory

    const handleClick = () => {
        const params = new URLSearchParams(searchParams)
        params.delete("category")

        const newUrl = params.toString() ? `?${params.toString()}` : ""
        router.push(`/dashboard${newUrl}`)
    }

    return (
        <SidebarMenuItem>
            <SidebarMenuButton
                onClick={handleClick}
                className={cn(
                    "w-full justify-start",
                    isActive && "bg-accent font-medium"
                )}
            >
                <span>All Categories</span>
            </SidebarMenuButton>
        </SidebarMenuItem>
    )
}

