import type { Option } from "@/components/form-fields"
import { $api } from "@/lib/api/client"

/** App config rows (GET /settings) as a key → value map. */
export function useSettingsMap() {
  const { data } = $api.useQuery("get", "/settings", {}, { staleTime: 5 * 60_000 })
  return new Map((data ?? []).map((s) => [s.config_key, s.config_value]))
}

/** TDS slab choices from settings.tds_slab_options ("2,10"), falling back to 2 / 10. */
export function useTdsSlabOptions(): Option[] {
  const raw = useSettingsMap().get("tds_slab_options") ?? "2,10"
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((pct) => ({ value: pct, label: `${pct}%` }))
}

/** "2.00" → "2" so API values match slab options. */
export function normalizePct(value?: string | null): string {
  return value ? String(Number(value)) : ""
}
