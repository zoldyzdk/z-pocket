import { redirect } from "next/navigation"

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  redirect("/")
}
