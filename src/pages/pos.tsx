import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { PlusIcon, SearchIcon } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"
import { useNavigate } from "react-router"
import { useDebounce } from "use-debounce"
import { z } from "zod"

import {
  AllocationRows,
  allocationRowSchema,
  EMPTY_ROW,
  toApiAllocations,
} from "@/components/allocation-rows"
import { DataTable, useOffsetPagination, type Columns } from "@/components/data-table"
import { FormDialog } from "@/components/form-dialog"
import { DateField, LookupCombobox, LookupField, MoneyField, TextField } from "@/components/form-fields"
import { ALL, FilterSelect, filterValue } from "@/components/filter-select"
import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { useCanEdit } from "@/hooks/use-current-user"
import { useClientLookup } from "@/hooks/use-lookups"
import { useClientNames } from "@/hooks/use-name-maps"
import { $api, fetchClient } from "@/lib/api/client"
import { options, PO_STATUSES, type PoStatus } from "@/lib/enums"
import type { components } from "@/lib/api/schema"
import { countLabel, formatDate, formatINR } from "@/lib/format"
import { dateRequired, idRequired, moneyRequired, termsDaysRequired, textRequired } from "@/lib/schemas"

type PO = components["schemas"]["POOut"]

export function PurchaseOrdersPage() {
  const canEdit = useCanEdit()
  const navigate = useNavigate()
  const clientName = useClientNames()
  const [search, setSearch] = React.useState("")
  const [q] = useDebounce(search, 300)
  const [clientId, setClientId] = React.useState<number | null>(null)
  const [status, setStatus] = React.useState<string>(ALL)
  const [creating, setCreating] = React.useState(false)
  const pagination = useOffsetPagination()

  const pos = $api.useQuery("get", "/pos", {
    params: {
      query: {
        q: q || undefined,
        client_id: clientId ?? undefined,
        status: filterValue<PoStatus>(status),
        limit: pagination.limit,
        offset: pagination.offset,
      },
    },
  })

  const columns: Columns<PO> = [
    { header: "PO number", cell: ({ row }) => <span className="font-bold">{row.original.po_number}</span> },
    { header: "Client", cell: ({ row }) => clientName(row.original.client_id) },
    { header: "PO date", cell: ({ row }) => formatDate(row.original.po_date) },
    {
      id: "value",
      header: () => <div className="text-right">PO value</div>,
      cell: ({ row }) => <div className="text-right tabular-nums">{formatINR(row.original.po_value)}</div>,
    },
    { header: "Terms", cell: ({ row }) => `${row.original.agreed_payment_terms_days} days` },
    {
      header: "Split",
      cell: ({ row }) => (
        <Badge variant={row.original.is_allocation_balanced ? "secondary" : "outline"}>
          {countLabel(row.original.allocations.length, "project")}
          {row.original.is_allocation_balanced ? "" : " · unbalanced"}
        </Badge>
      ),
    },
    { header: "Status", cell: ({ row }) => <StatusBadge value={row.original.status} /> },
  ]

  return (
    <>
      <PageHeader title="Purchase orders" description="Client POs are uploaded, never generated. Split across projects, then lock.">
        {canEdit && (
          <Button onClick={() => setCreating(true)}>
            <PlusIcon />
            New PO
          </Button>
        )}
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3 px-4 lg:px-6">
        <InputGroup className="max-w-xs">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Search PO number…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              pagination.reset()
            }}
          />
        </InputGroup>
        <LookupCombobox
          value={clientId}
          onChange={(item) => {
            setClientId(item?.id ?? null)
            pagination.reset()
          }}
          useItems={useClientLookup}
          placeholder="All clients"
          className="w-56"
        />
        <FilterSelect
          value={status}
          onChange={(v) => {
            setStatus(v)
            pagination.reset()
          }}
          allLabel="All statuses"
          options={options(PO_STATUSES)}
          className="w-40"
        />
      </div>

      <DataTable
        columns={columns}
        data={pos.data}
        isLoading={pos.isLoading}
        error={pos.error}
        emptyMessage="No purchase orders found."
        onRowClick={(po) => navigate(`/pos/${po.id}`)}
        pagination={pagination}
      />

      {creating && (
        <CreatePoDialog onClose={() => setCreating(false)} onCreated={(po) => navigate(`/pos/${po.id}`)} />
      )}
    </>
  )
}

const poSchema = z.object({
  po_number: textRequired.max(64),
  client_id: idRequired,
  po_date: dateRequired,
  po_value: moneyRequired.refine((v) => Number(v) > 0, "Must be more than 0"),
  agreed_payment_terms_days: termsDaysRequired,
  allocations: z.array(allocationRowSchema),
})

type PoFormInput = z.input<typeof poSchema>

function CreatePoDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (po: PO) => void }) {
  const form = useForm<PoFormInput, unknown, z.output<typeof poSchema>>({
    resolver: zodResolver(poSchema),
    defaultValues: {
      po_number: "",
      client_id: null as unknown as number,
      po_date: "",
      po_value: "",
      agreed_payment_terms_days: 45,
      allocations: [EMPTY_ROW],
    },
  })
  const clientId = useWatch({ control: form.control, name: "client_id" })
  const poValue = useWatch({ control: form.control, name: "po_value" })

  const create = $api.useMutation("post", "/pos", {
    onSuccess: (po) => {
      onClose()
      onCreated(po)
    },
  })

  return (
    <FormDialog
      open
      wide
      onOpenChange={(open) => !open && onClose()}
      title="New purchase order"
      description="Record the client's PO and split its value across projects. It can only lock once the split balances."
      submitLabel="Create PO"
      isPending={create.isPending}
      onSubmit={form.handleSubmit(({ allocations, ...body }) =>
        create.mutate({ body: { ...body, allocations: toApiAllocations(allocations, "allocated_value") } })
      )}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField control={form.control} name="po_number" label="PO number" maxLength={64} />
        <LookupField
          control={form.control}
          name="client_id"
          label="Client"
          useItems={useClientLookup}
          placeholder="Search client…"
          onSelect={async (item) => {
            // Autofill agreed terms from the client master (GET /clients/{id}).
            if (!item) return
            const { data } = await fetchClient.GET("/clients/{client_id}", {
              params: { path: { client_id: item.id } },
            })
            if (data && form.getValues("client_id") === item.id) {
              form.setValue("agreed_payment_terms_days", data.default_payment_terms_days)
            }
          }}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <DateField control={form.control} name="po_date" label="PO date" />
        <MoneyField control={form.control} name="po_value" label="PO value" />
        <TextField
          control={form.control}
          name="agreed_payment_terms_days"
          label="Payment terms (days)"
          type="number"
          min={0}
          max={365}
        />
      </div>
      <AllocationRows control={form.control} name="allocations" total={poValue} clientId={clientId} />
    </FormDialog>
  )
}
