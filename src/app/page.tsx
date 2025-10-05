import { Login } from "@/components/Login"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (session) {
    redirect("/dashboard")
  }
  return (
    <main className="min-h-svh bg-muted flex items-center justify-center">
      <div className="w-full max-w-sm md:max-w-3xl">
        <Login />
      </div>
    </main>
  )
}
