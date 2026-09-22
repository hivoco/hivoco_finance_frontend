import createFetchClient from "openapi-fetch"
import createClient from "openapi-react-query"

import type { paths } from "@/lib/api/schema"
import { useAuthStore } from "@/stores/auth"

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "https://api.finance.thefirstimpression.ai"

// Typed fetch client generated from the backend's OpenAPI spec (npm run gen:api).
export const fetchClient = createFetchClient<paths>({ baseUrl: API_BASE_URL })

fetchClient.use({
  onRequest({ request }) {
    const token = useAuthStore.getState().token
    if (token) request.headers.set("Authorization", `Bearer ${token}`)
    return request
  },
  onResponse({ response }) {
    // Expired/invalid token: drop it; the route guard sends the user to /login.
    if (response.status === 401) useAuthStore.getState().logout()
    return response
  },
})

// TanStack Query hooks: $api.useQuery("get", "/clients"), $api.useMutation(...)
export const $api = createClient(fetchClient)
