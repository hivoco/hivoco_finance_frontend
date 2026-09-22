import { LandmarkIcon } from "lucide-react"
import { Navigate } from "react-router"

import { LoginForm } from "@/components/login-form"
import { useAuthStore } from "@/stores/auth"

// Layout from the shadcn login-03 block.
export function LoginPage() {
  const token = useAuthStore((s) => s.token)
  if (token) return <Navigate to="/" replace />

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex items-center gap-2 self-center font-bold">
          <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <LandmarkIcon className="size-4" />
          </div>
          HiVoco Finance
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
