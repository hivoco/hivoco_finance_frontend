import Decimal from "decimal.js"
import { PlusIcon, Trash2Icon } from "lucide-react"
import {
  useFieldArray,
  useWatch,
  type ArrayPath,
  type Control,
  type FieldArray,
  type FieldPath,
  type FieldValues,
} from "react-hook-form"
import { z } from "zod"

import { LookupField, MoneyField, TextField } from "@/components/form-fields"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FieldLegend, FieldSet } from "@/components/ui/field"
import { useProjectNames } from "@/hooks/use-name-maps"
import { projectLookup } from "@/hooks/use-lookups"
import { useSettingsMap } from "@/hooks/use-settings"
import { formatINR, sumMoney } from "@/lib/money"
import { idRequired, moneyRequired, textOptional } from "@/lib/schemas"

// Per-project split rows shared by POs (allocated_value), invoices
// (allocated_value) and external costs (allocated_amount). The form always uses
// `amount`; map to the API key on submit.

export const allocationRowSchema = z.object({
  project_id: idRequired,
  amount: moneyRequired,
  remarks: textOptional,
})

export type AllocationRowInput = z.input<typeof allocationRowSchema>

export const EMPTY_ROW: AllocationRowInput = { project_id: null as unknown as number, amount: "", remarks: "" }

export function AllocationRows<T extends FieldValues>({
  control,
  name,
  total,
  clientId,
  label = "Project split",
  disabled,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<T, any, any>
  name: ArrayPath<T>
  /** The value the rows must add up to (PO value, invoice value, cost amount). */
  total?: string | null
  /** Narrows the project dropdown to this client's projects. */
  clientId?: number | null
  label?: string
  disabled?: boolean
}) {
  const { fields, append, remove } = useFieldArray({ control, name })
  const rows = (useWatch({ control, name: name as FieldPath<T> }) ?? []) as AllocationRowInput[]
  const path = (index: number, key: keyof AllocationRowInput) => `${name}.${index}.${key}` as FieldPath<T>
  const projectName = useProjectNames()
  const useProjects = projectLookup(clientId)

  return (
    <FieldSet>
      <FieldLegend variant="label">{label}</FieldLegend>
      {fields.map((field, index) => (
        <div key={field.id} className="grid items-start gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_10rem_auto]">
          <LookupField
            control={control}
            name={path(index, "project_id")}
            label="Project"
            useItems={useProjects}
            getLabel={projectName}
            placeholder="Search project…"
            disabled={disabled}
          />
          <MoneyField control={control} name={path(index, "amount")} label="Amount" disabled={disabled} />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="sm:mt-6"
            onClick={() => remove(index)}
            disabled={disabled}
          >
            <Trash2Icon />
            <span className="sr-only">Remove row</span>
          </Button>
          <div className="sm:col-span-3">
            <TextField control={control} name={path(index, "remarks")} label="Remarks" disabled={disabled} />
          </div>
        </div>
      ))}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="outline" size="sm" onClick={() => append(EMPTY_ROW as FieldArray<T, ArrayPath<T>>)} disabled={disabled}>
          <PlusIcon />
          Add project
        </Button>
        {total !== undefined && <BalanceIndicator total={total} amounts={rows.map((r) => r?.amount)} />}
      </div>
    </FieldSet>
  )
}

/** Live "allocated X / total Y — difference Z" (FRONTEND.md allocation rule). */
export function BalanceIndicator({ total, amounts }: { total?: string | null; amounts: (string | undefined)[] }) {
  const tolerance = new Decimal(useSettingsMap().get("allocation_rounding_tolerance") ?? "1.00")
  const allocated = sumMoney(amounts)
  let target: Decimal
  try {
    target = new Decimal(total || 0)
  } catch {
    target = new Decimal(0)
  }
  const difference = target.minus(allocated)
  const balanced = target.gt(0) && difference.abs().lte(tolerance)

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted-foreground">
        Allocated <span className="font-bold text-foreground tabular-nums">{formatINR(allocated.toFixed(2))}</span>
        {" / "}
        <span className="tabular-nums">{formatINR(target.toFixed(2))}</span>
      </span>
      <Badge variant={balanced ? "default" : "outline"}>
        {balanced ? "Balanced" : `Difference ${formatINR(difference.toFixed(2))}`}
      </Badge>
    </div>
  )
}

/** Form rows → API rows with the endpoint's amount key. */
export function toApiAllocations<K extends "allocated_value" | "allocated_amount">(
  rows: z.output<typeof allocationRowSchema>[],
  key: K
) {
  return rows.map((r) => ({ project_id: r.project_id, remarks: r.remarks, [key]: r.amount }) as {
    project_id: number
    remarks: string | null
  } & Record<K, string>)
}
