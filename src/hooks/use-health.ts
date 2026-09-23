import { $api } from "@/lib/api/client"

/** GET /health has no response model in the API, so its shape is declared here. */
type Health = { status?: string; db?: boolean; error?: string }

/**
 * Unauthenticated server check: is the API reachable, and is its database up?
 * Lets the UI separate "backend down" from "wrong password" / "no data".
 */
export function useHealth() {
  const query = $api.useQuery(
    "get",
    "/health",
    {},
    { retry: 0, staleTime: 30_000, refetchInterval: 60_000 }
  )
  const health = query.data as Health | undefined
  return {
    isLoading: query.isLoading,
    /** The API answered. */
    apiReachable: query.isSuccess,
    /** The API answered and reported its database as connected. */
    dbConnected: health?.db === true,
    detail: health?.error,
  }
}
