"use server"

import { SigninFormData } from "@/components/Login"
import { auth } from "@/lib/auth"
import { APIError } from "better-auth/api"

type SignUpResponse = Promise<{
  message: string
}>

/**
 * Handles user signup by calling the BetterAuth API.
 * @param formData - The data submitted from the signup form.
 * @returns A promise that resolves to a success message or throws an error.
 */
export const signin = async (formData: SigninFormData): SignUpResponse => {
  try {
    await auth.api.signInEmail({
      body: {
        email: formData.email,
        password: formData.password,
      },
    })
    return {
      message: `User ${formData.email} successfully signed in!`,
    }
  } catch (error) {
    if (error instanceof APIError) {
      throw new Error(error.message)
    }
    throw error
  }
}
