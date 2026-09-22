import type { components } from "@/lib/api/schema"

type ValidationError = components["schemas"]["ValidationError"]

// FastAPI error bodies: {"detail": "message"} for handled errors (incl. 409/423),
// or {"detail": ValidationError[]} for 422.
export function getErrorMessage(error: unknown): string {
  const detail = (error as { detail?: string | ValidationError[] })?.detail
  if (typeof detail === "string") return detail
  if (Array.isArray(detail) && detail.length > 0) {
    return detail.map((e) => `${e.loc.at(-1)}: ${e.msg}`).join(", ")
  }
  if (error instanceof Error) return error.message
  return "Something went wrong"
}
