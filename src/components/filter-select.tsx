import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

/** Sentinel for "no filter" (Radix Select can't use an empty string value). */
export const ALL = "all"

/** Returns undefined for ALL so it can go straight into query params. */
export function filterValue<T extends string>(value: string): T | undefined {
  return value === ALL ? undefined : (value as T)
}

/** List-page filter dropdown with an "All …" option. */
export function FilterSelect({
  value,
  onChange,
  options,
  allLabel,
  className = "w-44",
}: {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  allLabel: string
  className?: string
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
