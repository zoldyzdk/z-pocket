"use server"

import { SignupFormData } from "@/app/signup/page";
import { auth } from "@/lib/auth";
import { APIError } from "better-auth/api";

type SignUpResponse = Promise<{
  message: string;
}>;

/**
 * Handles user signup by calling the BetterAuth API.
 * @param formData - The data submitted from the signup form.
 * @returns A promise that resolves to a success message or throws an error.
 */
export const signup = async (formData: SignupFormData): SignUpResponse => {
  try {
    await auth.api.signUpEmail({
      body: {
        name: formData.name,
        email: formData.email,
        password: formData.password,
      }
    })
    return {
      message: `User ${formData.name} successfully registered!`,
    }
  } catch (error) {
    if (error instanceof APIError) {
      throw new Error(error.message);
    }
    throw error;
  }
};
