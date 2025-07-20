"use server"

import { SignupFormData } from "@/app/signup/page";
import { auth } from "@/lib/auth";

export const signup = async (formData: SignupFormData) => {
  await auth.api.signUpEmail({
    body: {
      name: formData.name,
      email: formData.email,
      password: formData.password,
    }
  })
};
