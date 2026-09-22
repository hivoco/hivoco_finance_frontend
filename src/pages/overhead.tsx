import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { PlusIcon } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { DataTable, useOffsetPagination, type Columns } from "@/components/data-table"
import { ALL, FilterSelect, filterValue } from "@/components/filter-select"
import { FormDialog } from "@/components/form-dialog"
import { DateField, MoneyField, SelectField, TextareaField, TextField } from "@/components/form-fields"
import { PageHeader } from "@/components/page-header"
import { SectionCards, type SectionCard } from "@/components/section-cards"
import { Section } from "@/components/section"
import { Button } from "@/components/ui/button"
import { useCanEdit } from "@/hooks/use-current-user"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { $api } from "@/lib/api/client"
import type { components } from "@/lib/api/schema"
import { MONTHS, options, OVERHEAD_CATEGORIES, type OverheadCategory } from "@/lib/enums"
import { countLabel, formatDate, formatINR, humanize } from "@/lib/format"
import { dateRequired, moneyRequired, textOptional } from "@/lib/schemas"

type Expense = components["schemas"]["OverheadOut"]

export function OverheadPage() {
  const canEdit = useCanEdit()
  const now = new Date()
  const [year, setYear] = React.useState(String(now.getFullYear()))
  const [month, setMonth] = React.useState(String(now.getMonth() + 1))
  const [category, setCategory] = React.useState<string>(ALL)
  const [creating, setCreating] = React.useState(false)
  const pagination = useOffsetPagination()

  const pool = $api.useQuery("get", "/overhead/pool", {
    params: { query: { year: Number(year), month: Number(month) } },
  })
  const expenses = $api.useQuery("get", "/overhead/expenses", {
    params: {
      query: { category: filterValue<OverheadCategory>(category), limit: pagination.limit, offset: pagination.offset },
    },
  })

  const p = pool.data
  const cards: SectionCard[] | undefined = p && [
    { label: "Pool total (FY to date)", value: formatINR(p.pool_total), footerTitle: `FY starting ${formatDate(p.fy_start)}` },
    {
      label: "Monthly rate",
      value: formatINR(p.monthly_rate),
      footerTitle: "Running average",
      footerNote: `${countLabel(p.elapsed_fy_months, "FY month")} elapsed`,
    },
    {
      label: "Split method",
      value: p.split_method === "UNSET" ? "Not set" : humanize(p.split_method),
      badge: p.split_pending ? "Pending" : undefined,
      footerTitle: p.split_pending ? "Waiting on the Chief Accountant" : "Apportioned to projects",
      footerNote: "Change it in Settings → overhead_split_method",
    },
  ]

  const years = Array.from({ length: 6 }, (_, i) => String(now.getFullYear() - 4 + i))

  const columns: Columns<Expense> = [
    { header: "Date", cell: ({ row }) => formatDate(row.original.expense_date) },
    { header: "Category", cell: ({ row }) => humanize(row.original.category) },
    { header: "Vendor", cell: ({ row }) => row.original.vendor ?? "—" },
    {
      id: "amount",
      header: () => <div className="text-right">Amount</div>,
      cell: ({ row }) => <div className="text-right tabular-nums">{formatINR(row.original.amount)}</div>,
    },
    { header: "Description", cell: ({ row }) => row.original.description ?? "—" },
  ]

  return (
    <>
      <PageHeader title="Overhead" description="Company overhead feeds a FY running-average pool that is apportioned to projects.">
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={y}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PageHeader>

      <SectionCards cards={cards} loadingCount={3} />

      <Section
        title="Expenses"
        action={
          canEdit && (
            <Button onClick={() => setCreating(true)}>
              <PlusIcon />
              New expense
            </Button>
          )
        }
      >
        <div className="px-4 lg:px-6">
          <FilterSelect
            value={category}
            onChange={(v) => {
              setCategory(v)
              pagination.reset()
            }}
            allLabel="All categories"
            options={options(OVERHEAD_CATEGORIES)}
          />
        </div>
        <DataTable
          columns={columns}
          data={expenses.data}
          isLoading={expenses.isLoading}
          error={expenses.error}
          emptyMessage="No overhead expenses recorded."
          pagination={pagination}
        />
      </Section>

      {creating && <ExpenseFormDialog onClose={() => setCreating(false)} />}
    </>
  )
}

const expenseSchema = z.object({
  expense_date: dateRequired,
  amount: moneyRequired,
  category: z.enum(["admin", "payroll", "generic_credit", "other"]),
  vendor: textOptional,
  description: textOptional,
})

function ExpenseFormDialog({ onClose }: { onClose: () => void }) {
  const form = useForm<z.input<typeof expenseSchema>, unknown, z.output<typeof expenseSchema>>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { expense_date: "", amount: "", category: "admin", vendor: "", description: "" },
  })
  const create = $api.useMutation("post", "/overhead/expenses", { onSuccess: onClose })

  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title="New overhead expense"
      submitLabel="Add expense"
      isPending={create.isPending}
      onSubmit={form.handleSubmit((body) => create.mutate({ body }))}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <DateField control={form.control} name="expense_date" label="Expense date" />
        <MoneyField control={form.control} name="amount" label="Amount" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField control={form.control} name="category" label="Category" options={options(OVERHEAD_CATEGORIES)} />
        <TextField control={form.control} name="vendor" label="Vendor (optional)" />
      </div>
      <TextareaField control={form.control} name="description" label="Description" />
    </FormDialog>
  )
}
