import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { AddLinkModal } from "../add-link-modal"
import { SidebarTrigger } from "../ui/sidebar"
import { ProfileMenu } from "./components/ProfileMenu"

export async function Navbar() {
  const session = await auth.api.getSession({
    headers: await headers(),
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
        <ProfileMenu session={session} />
      </div>
    </nav>
  )
}
