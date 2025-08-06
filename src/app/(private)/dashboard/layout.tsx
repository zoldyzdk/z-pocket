import { Navbar } from "@/components/Navbar"

export default function LoggedAreaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main>
      <Navbar />
      {children}
    </main>
  )
}
