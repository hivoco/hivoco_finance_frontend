import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { PlusIcon } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"
import { useNavigate } from "react-router"
import { z } from "zod"

import {
  AllocationRows,
  allocationRowSchema,
  toApiAllocations,
} from "@/components/allocation-rows"
import { DataTable, useOffsetPagination, type Columns } from "@/components/data-table"
import { ALL, FilterSelect, filterValue } from "@/components/filter-select"
import { FormDialog } from "@/components/form-dialog"
import { LookupCombobox, LookupField, MoneyField, SwitchField, TextField } from "@/components/form-fields"
import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useCanEdit } from "@/hooks/use-current-user"
import { projectLookup, useVendorLookup } from "@/hooks/use-lookups"
import { useProjectNames, useVendorNames } from "@/hooks/use-name-maps"
import { $api, fetchClient } from "@/lib/api/client"
import { options, PAYMENT_STATUSES, type PaymentStatus } from "@/lib/enums"
import type { components } from "@/lib/api/schema"
import { countLabel, formatINR } from "@/lib/format"
import { idOptional, idRequired, moneyRequired, termsDaysOptional } from "@/lib/schemas"

type Cost = components["schemas"]["CostOut"]

const useAllProjects = projectLookup()

export function CostsPage() {
  const canEdit = useCanEdit()
  const navigate = useNavigate()
  const vendorName = useVendorNames()
  const projectName = useProjectNames()
  const [projectId, setProjectId] = React.useState<number | null>(null)
  const [vendorId, setVendorId] = React.useState<number | null>(null)
  const [paymentStatus, setPaymentStatus] = React.useState<string>(ALL)
  const [creating, setCreating] = React.useState(false)
  const pagination = useOffsetPagination()

  const costs = $api.useQuery("get", "/costs", {
    params: {
      query: {
        project_id: projectId ?? undefined,
        vendor_id: vendorId ?? undefined,
        payment_status: filterValue<PaymentStatus>(paymentStatus),
        limit: pagination.limit,
        offset: pagination.offset,
      },
    },
  })

  const columns: Columns<Cost> = [
    { header: "#", cell: ({ row }) => <span className="text-muted-foreground">{row.original.id}</span> },
    { header: "Vendor", cell: ({ row }) => <span className="font-bold">{vendorName(row.original.vendor_id)}</span> },
    {
      header: "Project",
      cell: ({ row }) =>
        row.original.allocations.length > 0
          ? `Split · ${countLabel(row.original.allocations.length, "project")}`
          : projectName(row.original.project_id),
    },
    {
      id: "amount",
      header: () => <div className="text-right">Amount</div>,
      cell: ({ row }) => (
        <div className="text-right tabular-nums">{formatINR(row.original.final_amount ?? row.original.tentative_amount)}</div>
      ),
    },
    {
      id: "net",
      header: () => <div className="text-right">Net payable</div>,
      cell: ({ row }) => <div className="text-right tabular-nums">{formatINR(row.original.net_payable)}</div>,
    },
    {
      header: "Stage",
      cell: ({ row }) => (
        <Badge variant={row.original.is_provisional ? "outline" : "secondary"}>
          {row.original.is_provisional ? "Tentative" : "Final"}
        </Badge>
      ),
    },
    {
      header: "Sign-off",
      cell: ({ row }) => (
        <Badge variant={row.original.payment_processed ? "default" : "outline"}>
          {Math.min(row.original.signoffs.length, 2)}/2
        </Badge>
      ),
    },
    { header: "Payment", cell: ({ row }) => <StatusBadge value={row.original.payment_status} /> },
  ]

  return (
    <>
      <PageHeader title="External costs" description="Vendor costs: tentative → vendor invoice (final) → two sign-offs → payment.">
        {canEdit && (
          <Button onClick={() => setCreating(true)}>
            <PlusIcon />
            New cost
          </Button>
        )}
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3 px-4 lg:px-6">
        <LookupCombobox
          value={projectId}
          onChange={(item) => {
            setProjectId(item?.id ?? null)
            pagination.reset()
          }}
          useItems={useAllProjects}
          placeholder="All projects"
          className="w-56"
        />
        <LookupCombobox
          value={vendorId}
          onChange={(item) => {
            setVendorId(item?.id ?? null)
            pagination.reset()
          }}
          useItems={useVendorLookup}
          placeholder="All vendors"
          className="w-56"
        />
        <FilterSelect
          value={paymentStatus}
          onChange={(v) => {
            setPaymentStatus(v)
            pagination.reset()
          }}
          allLabel="All payments"
          options={options(PAYMENT_STATUSES)}
        />
      </div>

      <DataTable
        columns={columns}
        data={costs.data}
        isLoading={costs.isLoading}
        error={costs.error}
        emptyMessage="No external costs found."
        onRowClick={(c) => navigate(`/costs/${c.id}`)}
        pagination={pagination}
      />

      {creating && <CreateCostDialog onClose={() => setCreating(false)} onCreated={(c) => navigate(`/costs/${c.id}`)} />}
    </>
  )
}

const costSchema = z
  .object({
    vendor_id: idRequired,
    tentative_amount: moneyRequired.refine((v) => Number(v) > 0, "Must be more than 0"),
    split: z.boolean(),
    project_id: idOptional,
    allocations: z.array(allocationRowSchema),
    payment_terms_days: termsDaysOptional,
  })
  .refine((v) => v.split || v.project_id, { path: ["project_id"], message: "Pick a project" })
  .refine((v) => !v.split || v.allocations.length > 0, { path: ["allocations"], message: "Add at least one project" })

type CostFormInput = z.input<typeof costSchema>

function CreateCostDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (cost: Cost) => void }) {
  const form = useForm<CostFormInput, unknown, z.output<typeof costSchema>>({
    resolver: zodResolver(costSchema),
    defaultValues: {
      vendor_id: null as unknown as number,
      tentative_amount: "",
      split: false,
      project_id: null,
      allocations: [],
      payment_terms_days: "",
    },
  })
  const [split, tentative] = useWatch({ control: form.control, name: ["split", "tentative_amount"] })
  const create = $api.useMutation("post", "/costs", {
    onSuccess: (cost) => {
      onClose()
      onCreated(cost)
    },
  })

  return (
    <FormDialog
      open
      wide
      onOpenChange={(open) => !open && onClose()}
      title="New external cost"
      description="Record the tentative amount now; the vendor invoice makes it final later."
      submitLabel="Create cost"
      isPending={create.isPending}
      onSubmit={form.handleSubmit((v) =>
        create.mutate({
          body: {
            vendor_id: v.vendor_id,
            tentative_amount: v.tentative_amount,
            payment_terms_days: v.payment_terms_days,
            ...(v.split
              ? { allocations: toApiAllocations(v.allocations, "allocated_amount") }
              : { project_id: v.project_id }),
          },
        })
      )}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <LookupField
          control={form.control}
          name="vendor_id"
          label="Vendor"
          useItems={useVendorLookup}
          placeholder="Search vendor…"
          onSelect={async (item) => {
            // Pre-fill the vendor's default terms (GET /vendors/{id}).
            if (!item) return
            const { data } = await fetchClient.GET("/vendors/{vendor_id}", {
              params: { path: { vendor_id: item.id } },
            })
            if (data && form.getValues("vendor_id") === item.id) {
              form.setValue("payment_terms_days", String(data.default_payment_terms_days))
            }
          }}
        />
        <MoneyField control={form.control} name="tentative_amount" label="Tentative amount" />
        <TextField
          control={form.control}
          name="payment_terms_days"
          label="Payment terms (days)"
          type="number"
          min={0}
          max={365}
        />
      </div>
      <SwitchField
        control={form.control}
        name="split"
        label="Split across projects"
        description="One vendor invoice can cover several projects."
      />
      {split ? (
        <AllocationRows control={form.control} name="allocations" total={tentative} />
      ) : (
        <LookupField
          control={form.control}
          name="project_id"
          label="Project"
          useItems={useAllProjects}
          placeholder="Search project…"
        />
      )}
    </FormDialog>
  )
}
