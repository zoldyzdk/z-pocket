import { AddLinkModal } from "@/components/add-link-modal"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Link } from "lucide-react"

export default async function Page() {

  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Link />
        </EmptyMedia>
      </EmptyHeader>
      <EmptyTitle>Your link collection is empty</EmptyTitle>
      <EmptyDescription>
        Start building your personal link library by saving your first link.
        Keep all your important bookmarks organized and easily accessible.
      </EmptyDescription>
      <EmptyContent>
        <AddLinkModal />
      </EmptyContent>
    </Empty>
  )
}
