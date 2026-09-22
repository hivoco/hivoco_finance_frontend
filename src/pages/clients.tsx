import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { PencilIcon, PlusIcon, SearchIcon } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"
import { useDebounce } from "use-debounce"
import { z } from "zod"

import { DataTable, useOffsetPagination, type Columns } from "@/components/data-table"
import { FormDialog } from "@/components/form-dialog"
import { DateField, SwitchField, TextareaField, TextField } from "@/components/form-fields"
import { PageHeader } from "@/components/page-header"
import { BoolBadge } from "@/components/status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useIsSuperAdmin } from "@/hooks/use-current-user"
import { $api } from "@/lib/api/client"
import type { components } from "@/lib/api/schema"
import { formatDate } from "@/lib/format"
import { codeOptional, dateOptional, termsDaysRequired, textOptional, textRequired } from "@/lib/schemas"

type Client = components["schemas"]["ClientOut"]

export function ClientsPage() {
  const isSuperAdmin = useIsSuperAdmin()
  const [search, setSearch] = React.useState("")
  const [q] = useDebounce(search, 300)
  const [activeOnly, setActiveOnly] = React.useState(true)
  const pagination = useOffsetPagination()
  const [editing, setEditing] = React.useState<Client | "new" | null>(null)

  const clients = $api.useQuery("get", "/clients", {
    params: {
      query: { q: q || undefined, active_only: activeOnly, limit: pagination.limit, offset: pagination.offset },
    },
  })

  const columns: Columns<Client> = [
    {
      header: "Client",
      cell: ({ row }) => (
        <div className="min-w-0">
          <div className="font-bold">{row.original.display_name}</div>
          <div className="truncate text-xs text-muted-foreground">{row.original.legal_name}</div>
        </div>
      ),
    },
    { header: "GSTIN", cell: ({ row }) => row.original.gstin ?? "—" },
    { header: "PAN", cell: ({ row }) => row.original.pan ?? "—" },
    { header: "State", cell: ({ row }) => row.original.state_code ?? "—" },
    { header: "Terms", cell: ({ row }) => `${row.original.default_payment_terms_days} days` },
    {
      header: "Nil TDS cert",
      cell: ({ row }) =>
        row.original.nil_tds_cert ? (
          <Badge variant="secondary">till {formatDate(row.original.nil_tds_cert_valid_till)}</Badge>
        ) : (
          "—"
        ),
    },
    {
      header: "Status",
      cell: ({ row }) => <BoolBadge value={row.original.is_active} yes="Active" no="Inactive" />,
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) =>
        isSuperAdmin && (
          <Button variant="ghost" size="icon-sm" onClick={() => setEditing(row.original)}>
            <PencilIcon />
            <span className="sr-only">Edit</span>
          </Button>
        ),
    },
  ]

  return (
    <>
      <PageHeader title="Clients" description="Client master — powers invoice and PO autofill.">
        {isSuperAdmin && (
          <Button onClick={() => setEditing("new")}>
            <PlusIcon />
            New client
          </Button>
        )}
      </PageHeader>

      <div className="flex flex-wrap items-center gap-4 px-4 lg:px-6">
        <InputGroup className="max-w-xs">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Search name…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              pagination.reset()
            }}
          />
        </InputGroup>
        <div className="flex items-center gap-2">
          <Switch
            id="active-only"
            checked={activeOnly}
            onCheckedChange={(v) => {
              setActiveOnly(v)
              pagination.reset()
            }}
          />
          <Label htmlFor="active-only">Active only</Label>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={clients.data}
        isLoading={clients.isLoading}
        error={clients.error}
        emptyMessage={q ? "No clients match your search." : "No clients yet."}
        pagination={pagination}
      />

      {editing && (
        <ClientFormDialog
          clientId={editing === "new" ? null : editing.id}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  )
}

const clientSchema = z
  .object({
    legal_name: textRequired.max(190),
    display_name: textRequired.max(120),
    gstin: codeOptional.pipe(z.string().length(15, "GSTIN is 15 characters").nullable()),
    pan: codeOptional.pipe(z.string().length(10, "PAN is 10 characters").nullable()),
    billing_address: textOptional,
    state_code: textOptional.pipe(z.string().max(2, "2-digit state code").nullable()),
    default_payment_terms_days: termsDaysRequired,
    nil_tds_cert: z.boolean(),
    nil_tds_cert_valid_till: dateOptional,
    is_active: z.boolean(),
  })
  .refine((v) => !v.nil_tds_cert || v.nil_tds_cert_valid_till, {
    path: ["nil_tds_cert_valid_till"],
    message: "Add the certificate's validity date",
  })

type ClientFormInput = z.input<typeof clientSchema>

const EMPTY: ClientFormInput = {
  legal_name: "",
  display_name: "",
  gstin: "",
  pan: "",
  billing_address: "",
  state_code: "",
  default_payment_terms_days: 45,
  nil_tds_cert: false,
  nil_tds_cert_valid_till: "",
  is_active: true,
}

function ClientFormDialog({ clientId, onClose }: { clientId: number | null; onClose: () => void }) {
  const isEdit = clientId !== null
  const detail = $api.useQuery(
    "get",
    "/clients/{client_id}",
    { params: { path: { client_id: clientId ?? 0 } } },
    { enabled: isEdit }
  )

  const form = useForm<ClientFormInput, unknown, z.output<typeof clientSchema>>({
    resolver: zodResolver(clientSchema),
    defaultValues: EMPTY,
  })

  // Load the fresh record (GET /clients/{id}) into the form when editing.
  const { reset } = form
  React.useEffect(() => {
    const c = detail.data
    if (!c) return
    reset({
      legal_name: c.legal_name,
      display_name: c.display_name,
      gstin: c.gstin ?? "",
      pan: c.pan ?? "",
      billing_address: c.billing_address ?? "",
      state_code: c.state_code ?? "",
      default_payment_terms_days: c.default_payment_terms_days,
      nil_tds_cert: c.nil_tds_cert,
      nil_tds_cert_valid_till: c.nil_tds_cert_valid_till ?? "",
      is_active: c.is_active,
    })
  }, [detail.data, reset])

  const create = $api.useMutation("post", "/clients", { onSuccess: onClose })
  const update = $api.useMutation("put", "/clients/{client_id}", { onSuccess: onClose })
  const nilTds = useWatch({ control: form.control, name: "nil_tds_cert" })

  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={isEdit ? "Edit client" : "New client"}
      description="GSTIN, PAN and address auto-fill invoices raised for this client."
      submitLabel={isEdit ? "Save changes" : "Create client"}
      isPending={create.isPending || update.isPending}
      onSubmit={form.handleSubmit(({ is_active, ...body }) => {
        const payload = { ...body, nil_tds_cert_valid_till: body.nil_tds_cert ? body.nil_tds_cert_valid_till : null }
        if (isEdit) {
          update.mutate({ params: { path: { client_id: clientId } }, body: { ...payload, is_active } })
        } else {
          create.mutate({ body: payload })
        }
      })}
    >
      <TextField control={form.control} name="display_name" label="Display name" />
      <TextField control={form.control} name="legal_name" label="Legal name" />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField control={form.control} name="gstin" label="GSTIN" maxLength={15} className="uppercase" />
        <TextField control={form.control} name="pan" label="PAN" maxLength={10} className="uppercase" />
      </div>
      <TextareaField control={form.control} name="billing_address" label="Billing address" />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField control={form.control} name="state_code" label="State code" maxLength={2} placeholder="27" />
        <TextField
          control={form.control}
          name="default_payment_terms_days"
          label="Payment terms (days)"
          type="number"
          min={0}
          max={365}
        />
      </div>
      <SwitchField
        control={form.control}
        name="nil_tds_cert"
        label="Nil-TDS certificate"
        description="While valid, client TDS on invoices is forced to 0."
      />
      {nilTds && <DateField control={form.control} name="nil_tds_cert_valid_till" label="Certificate valid till" />}
      {isEdit && (
        <SwitchField
          control={form.control}
          name="is_active"
          label="Active"
          description="Inactive clients are hidden from dropdowns."
        />
      )}
    </FormDialog>
  )
}
