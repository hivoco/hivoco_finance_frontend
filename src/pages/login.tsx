import { Navigate } from "react-router"

import { LoginForm } from "@/components/login-form"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useHealth } from "@/hooks/use-health"
import { useAuthStore } from "@/stores/auth"

// Layout from the shadcn login-03 block.
export function LoginPage() {
  const token = useAuthStore((s) => s.token)
  const { isLoading, apiReachable, dbConnected } = useHealth()
  if (token) return <Navigate to="/" replace />
  const serverProblem = !isLoading && (!apiReachable || !dbConnected)

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex items-center gap-2 self-center font-bold">
          <img src="/hivoco-mark.png" alt="" className="size-7" />
          HiVoco Finance
        </div>
        {serverProblem && (
          <Alert variant="destructive">
            <AlertTitle>{apiReachable ? "Server database unavailable" : "Can't reach the server"}</AlertTitle>
            <AlertDescription>
              {apiReachable
                ? "The API is up but its database isn't responding. Signing in will fail — try again shortly."
                : "The finance API isn't responding. This isn't your password — try again shortly."}
            </AlertDescription>
          </Alert>
        )}
        <LoginForm />
      </div>
    </div>
  )
}
