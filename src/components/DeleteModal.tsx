import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { Loader2, Trash2 } from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { deleteLinks } from "@/actions/deleteLinks"


interface DeleteModalProps {
  linkId: string
}

export function DeleteModal({ linkId }: DeleteModalProps) {
  const [isLoading, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const handleDelete = async () => {
    startTransition(async () => {
      const result = await deleteLinks(linkId);
      if (result.error) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setIsOpen(false);
    });
  };

  return (
    <Tooltip>
      <TooltipContent>
        Delete link
      </TooltipContent>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              <Trash2 className="size-5" />
            </Button>
          </TooltipTrigger>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete this link
              and remove it from your reading list.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
              {isLoading ? <Loader2 className="size-4 animate-spin" /> : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tooltip>
  )
}
