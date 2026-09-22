import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { ThemeProvider } from "next-themes"
import { RouterProvider } from "react-router"
import { toast } from "sonner"

import "./index.css"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { getErrorMessage } from "@/lib/api/errors"
import { router } from "@/routes"

const queryClient: QueryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
  mutationCache: new MutationCache({
    // Any write can change lists, details and reports (e.g. finalizing an
    // invoice moves revenue), so refetch whatever is on screen.
    onSuccess: () => queryClient.invalidateQueries(),
    // Show the backend's `detail` for failed mutations that don't handle their
    // own error (400/403/409/423 messages are written for users).
    onError: (error, _vars, _ctx, mutation) => {
      if (!mutation.options.onError) toast.error(getErrorMessage(error))
    },
  }),
})

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* SPA: the inline theme script never runs on the client; mark it as data so
        React 19 does not warn. index.html starts with class="dark" instead. */}
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      scriptProps={{ type: "application/json" }}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <RouterProvider router={router} />
          <Toaster richColors />
        </TooltipProvider>
        <ReactQueryDevtools buttonPosition="bottom-left" />
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>
)
