import { Login } from "@/components/Login"

export default function Home() {
  return (
    <main className="min-h-svh bg-muted flex items-center justify-center">
      <div className="w-full max-w-sm md:max-w-3xl">
        <Login />
      </div>
    </main>
  )
}
