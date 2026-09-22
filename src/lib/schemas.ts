import { z } from "zod"

// Reusable zod pieces for forms. Forms hold strings; these transform to the
// shapes the API expects (money as decimal strings, blanks as null).

export const moneyRequired = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "Enter an amount like 125000 or 125000.50")

export const moneyOptional = z
  .string()
  .trim()
  .regex(/^(\d+(\.\d{1,2})?)?$/, "Enter an amount like 125000 or 125000.50")
  .transform((v) => v || null)

export const textRequired = z.string().trim().min(1, "Required")

export const textOptional = z
  .string()
  .trim()
  .transform((v) => v || null)

/** GSTIN / PAN style codes: stored uppercase, blank → null. */
export const codeOptional = z
  .string()
  .trim()
  .transform((v) => v.toUpperCase() || null)

export const dateRequired = z.string().min(1, "Pick a date")

export const dateOptional = z.string().transform((v) => v || null)

// Payment terms in days (0–365). Number inputs hand back strings; a blank field
// must not coerce to 0 (Number("") === 0), so blanks are checked first.
const termsDays = z.coerce
  .number<string | number>()
  .int("Whole number of days")
  .min(0, "Must be 0 or more")
  .max(365, "Max 365 days")

export const termsDaysRequired = z
  .union([z.string(), z.number()])
  .refine((v) => String(v).trim() !== "", "Required")
  .pipe(termsDays)

/** Blank → null (the API then falls back to its own default). */
export const termsDaysOptional = z
  .union([z.string(), z.number()])
  .transform((v) => (String(v).trim() === "" ? null : v))
  .pipe(termsDays.nullable())

export const idRequired = z.number({ error: "Required" }).int().positive("Required")

export const idOptional = z.number().int().positive().nullable()
