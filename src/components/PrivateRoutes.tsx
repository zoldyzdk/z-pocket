import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { ReactNode } from "react"
import { redirect } from "next/navigation"

type PrivateRoutesProps = {
  children: ReactNode
}

export default async function PrivateRoutes({ children }: PrivateRoutesProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) {
    redirect("/")
  }

  return (
    <div>
      {children}
    </div>
  )
}
