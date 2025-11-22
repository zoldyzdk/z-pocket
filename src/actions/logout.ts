"use server"

import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

export const logout = async () => {
  try {
    await auth.api.signOut({
      headers: await headers(),
    })
    redirect("/")
  } catch (error) {
    console.error("Error logging out:", error)
    throw new Error("Failed to logout")
  }
}
