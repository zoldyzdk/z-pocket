import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"

export function DeleteModal() {
    return (
        <Dialog>
            <DialogTrigger>
                <Tooltip>
                    <TooltipContent>
                        Delete link
                    </TooltipContent>
                    <TooltipTrigger asChild>
                        <Button
                            variant="secondary"
                            size="icon"
                            className="shrink-0 text-muted-foreground hover:text-foreground"
                        >
                            <Trash2 className="size-5" />
                        </Button>
                    </TooltipTrigger>
                </Tooltip>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Are you absolutely sure?</DialogTitle>
                    <DialogDescription>
                        This action cannot be undone. This will permanently delete your account
                        and remove your data from our servers.
                    </DialogDescription>
                </DialogHeader>
            </DialogContent>
        </Dialog>
    )
}
