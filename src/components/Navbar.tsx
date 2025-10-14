import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { ShimmeringText } from "./ui/shimmering-text"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "./ui/button"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { SidebarTrigger } from "./ui/sidebar"
import { AddLinkModal } from "./add-link-modal"

export async function Navbar() {
  const session = await auth.api.getSession({
    headers: await headers(), // you need to pass the headers object.
  })
  return (
    <nav className="border h-20 flex items-center justify-between p-2">
      <SidebarTrigger />
      <div className="flex items-center gap-4">
        <AddLinkModal />
        <Avatar>
          <AvatarImage src="https://avatars.githubusercontent.com/u/90076846?v=4" alt="@shadcn" />
          <AvatarFallback>CN</AvatarFallback>
        </Avatar>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">{session?.user?.name}</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Billing</DropdownMenuItem>
            <DropdownMenuItem>Team</DropdownMenuItem>
            <DropdownMenuItem>Subscription</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  )
}
