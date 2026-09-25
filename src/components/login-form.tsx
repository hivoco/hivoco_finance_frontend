import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQueryClient } from "@tanstack/react-query"
import { Controller, useForm } from "react-hook-form"
import { useLocation, useNavigate } from "react-router"
import { toast } from "sonner"
import { z } from "zod"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { PasswordField } from "@/components/form-fields"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { $api } from "@/lib/api/client"
import { getErrorMessage } from "@/lib/api/errors"
import { useAuthStore } from "@/stores/auth"

const loginSchema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
})

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const setToken = useAuthStore((s) => s.setToken)

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  const login = $api.useMutation("post", "/auth/login", {
    onSuccess: (data) => {
      queryClient.clear() // never show a previous user's cached data
      setToken(data.access_token)
      const from = (location.state as { from?: string } | null)?.from ?? "/"
      navigate(from, { replace: true })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Welcome back</CardTitle>
          <CardDescription>Sign in with your work account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit((body) => login.mutate({ body }))}>
            <FieldGroup>
              <Controller
                name="email"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <Input
                      {...field}
                      id="email"
                      type="email"
                      autoComplete="username"
                      placeholder="you@hivoco.com"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <PasswordField
                control={form.control}
                name="password"
                label="Password"
                autoComplete="current-password"
              />
              <Field>
                <Button type="submit" disabled={login.isPending}>
                  {login.isPending && <Spinner />}
                  Login
                </Button>
                <FieldDescription className="text-center">
                  No account? Ask a super admin to create one.
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
