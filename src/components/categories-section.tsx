"use client"

import { usePathname } from "next/navigation"
import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
} from "@/components/ui/sidebar"
import { AllCategoriesMenuItem } from "./all-categories-menu-item"
import { CategoryMenuItem } from "./category-menu-item"

interface CategoriesSectionProps {
    categories: Array<{ id: string; name: string }>
}

export function CategoriesSection({ categories }: CategoriesSectionProps) {
    const pathname = usePathname()

    const showCategories =
        categories.length > 0 &&
        pathname?.includes("/dashboard") &&
        !pathname?.includes("/dashboard/archived")

    if (!showCategories) {
        return null
    }

    return (
        <SidebarGroup>
            <SidebarGroupLabel>Categories</SidebarGroupLabel>
            <SidebarGroupContent>
                <SidebarMenu>
                    <AllCategoriesMenuItem />
                    {categories.map((category) => (
                        <CategoryMenuItem key={category.id} categoryName={category.name} />
                    ))}
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    )
}

