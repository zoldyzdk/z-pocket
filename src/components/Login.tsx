"use client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { cn } from "@/lib/utils"
import Image from "next/image"
import Link from "next/link"
import { GoogleIcon } from "./icons/Google"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { signin } from "@/actions/signIn"
import { toast } from "sonner"

const signinSchema = z.object({
  email: z
    .email("Please enter a valid email address")
    .min(1, "Email is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .max(70, "Password must be between 8 and 70 characters long"),
})

export type SigninFormData = z.infer<typeof signinSchema>

export function Login({ className, ...props }: React.ComponentProps<"div">) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const form = useForm<SigninFormData>({
    resolver: zodResolver(signinSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const onSubmit = async (formData: SigninFormData) => {
    startTransition(async () => {
      try {
        const result = await signin(formData)
        toast.success(result.message)
        setTimeout(() => {
          router.push("/dashboard")
        }, 2000)
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "An unexpected error occurred"
        toast.error(errorMessage)
      }
    })
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <div className="p-6 md:p-8">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex flex-col gap-6"
              >
                <div className="flex flex-col items-center text-center">
                  <h1 className="text-2xl font-bold">Welcome back</h1>
                  <p className="text-muted-foreground text-balance">
                    Login to your Z Pocket account
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="m@example.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center">
                        <FormLabel>Password</FormLabel>
                        <a
                          href="#"
                          className="ml-auto text-sm underline-offset-2 hover:underline"
                        >
                          Forgot your password?
                        </a>
                      </div>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button disabled={isPending} type="submit" className="w-full">
                  {isPending ? "Logging in..." : "Login"}
                </Button>

                {/* OAuth login - temporarily hidden until OAuth is implemented */}
                {/* <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
                  <span className="bg-card text-muted-foreground relative z-10 px-2">
                    Or continue with
                  </span>
                </div>

                <div className="grid w-full h-10 gap-4">
                  <Button variant="outline" type="button" className="w-full">
                    <GoogleIcon />
                    <span className="sr-only">Login with Google</span>
                  </Button>
                </div> */}

                <div className="text-center text-sm">
                  Don&apos;t have an account?{" "}
                  <Link href="/signup" className="underline underline-offset-4">
                    Sign up
                  </Link>
                </div>
              </form>
            </Form>
          </div>
          <div className="bg-muted relative hidden md:block">
            <Image
              src="/man-reading.jpg"
              alt="Image"
              className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
              width={300}
              height={300}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
