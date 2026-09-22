import Decimal from "decimal.js"

// Money arrives from the API as decimal strings ("100000.00"). Intl formats the
// string directly, so no float conversion ever happens. Use decimal.js for math.
const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
})

export function formatINR(value?: string | null): string {
  if (value === null || value === undefined || value === "") return "—"
  return inr.format(value as Intl.StringNumericLiteral)
}

/** Sum decimal strings exactly; blank/invalid entries count as 0. */
export function sumMoney(values: (string | null | undefined)[]): Decimal {
  return values.reduce<Decimal>((total, v) => {
    try {
      return total.plus(new Decimal(v || 0))
    } catch {
      return total
    }
  }, new Decimal(0))
}
