import { create } from "zustand"
import { persist } from "zustand/middleware"

// Client-only auth state: just the JWT. The user profile (name, role) is server
// state and comes from GET /auth/me via TanStack Query (see useCurrentUser).
type AuthState = {
  token: string | null
  setToken: (token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      setToken: (token) => set({ token }),
      logout: () => set({ token: null }),
    }),
    { name: "finance_auth" }
  )
)
