import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { getArchivedLinks } from "@/lib/queries"

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "N/A"
  try {
    const date = new Date(dateString)
    return date.toLocaleString()
  } catch {
    return "N/A"
  }
}

export default async function ArchivedPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) {
    return (
      <div className="p-4">
        <h1>You are not logged in</h1>
        <p>Please log in to access this page.</p>
      </div>
    )
  }

  const archivedLinks = await getArchivedLinks(session.user.id)

  return (
    <section className="p-4">
      <h1 className="text-2xl font-bold mb-4">Archived</h1>
      {archivedLinks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <h2 className="text-xl font-semibold text-muted-foreground mb-2">
            No archived links yet
          </h2>
          <p className="text-muted-foreground">
            Links you archive will appear here
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>URL</TableHead>
              <TableHead>Archived At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {archivedLinks.map((link) => (
              <TableRow key={link.id}>
                <TableCell className="font-medium">
                  {link.title || "Untitled Link"}
                </TableCell>
                <TableCell>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {link.url}
                  </a>
                </TableCell>
                <TableCell>{formatDate(link.archivedAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  )
}