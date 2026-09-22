import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { FileTextIcon, PlusIcon } from "lucide-react"
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
import { DateField, LookupField, MoneyField, SwitchField, TextareaField, TextField } from "@/components/form-fields"
import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useIsSuperAdmin } from "@/hooks/use-current-user"
import { poLookup, projectLookup, useClientLookup } from "@/hooks/use-lookups"
import { usePoNumbers } from "@/hooks/use-name-maps"
import { useSettingsMap } from "@/hooks/use-settings"
import { $api } from "@/lib/api/client"
import {
  INVOICE_STATUSES,
  options,
  PAYMENT_STATUSES,
  type InvoiceStatus,
  type PaymentStatus,
} from "@/lib/enums"
import type { components } from "@/lib/api/schema"
import { formatDate, formatINR, humanize, toApiDate } from "@/lib/format"
import { dateRequired, idRequired, moneyOptional, moneyRequired, textOptional } from "@/lib/schemas"

type Invoice = components["schemas"]["InvoiceOut"]

export function InvoicesPage() {
  const navigate = useNavigate()
  const isSuperAdmin = useIsSuperAdmin()
  const poNumber = usePoNumbers()
  const [status, setStatus] = React.useState<string>(ALL)
  const [paymentStatus, setPaymentStatus] = React.useState<string>(ALL)
  const [creating, setCreating] = React.useState(false)
  const pagination = useOffsetPagination()

  const invoices = $api.useQuery("get", "/invoices", {
    params: {
      query: {
        status: filterValue<InvoiceStatus>(status),
        payment_status: filterValue<PaymentStatus>(paymentStatus),
        limit: pagination.limit,
        offset: pagination.offset,
      },
    },
  })

  const columns: Columns<Invoice> = [
    {
      header: "Invoice",
      cell: ({ row }) => (
        <span className="font-bold">{row.original.invoice_number ?? `Draft #${row.original.id}`}</span>
      ),
    },
    { header: "PO", cell: ({ row }) => poNumber(row.original.po_id) },
    { header: "Date", cell: ({ row }) => formatDate(row.original.invoice_date) },
    {
      id: "value",
      header: () => <div className="text-right">Value</div>,
      cell: ({ row }) => <div className="text-right tabular-nums">{formatINR(row.original.invoice_value)}</div>,
    },
    {
      id: "expected",
      header: () => <div className="text-right">Expected</div>,
      cell: ({ row }) => <div className="text-right tabular-nums">{formatINR(row.original.amount_expected)}</div>,
    },
    { header: "Due date", cell: ({ row }) => formatDate(row.original.expected_payment_date) },
    // Filled once a payment is recorded; "—" until then.
    { header: "Receipt date", cell: ({ row }) => formatDate(row.original.actual_receipt_date) },
    { header: "Status", cell: ({ row }) => <StatusBadge value={row.original.status} /> },
    { header: "Payment", cell: ({ row }) => <StatusBadge value={row.original.payment_status} /> },
    {
      id: "pdf",
      header: () => <span className="sr-only">PDF</span>,
      cell: ({ row }) => {
        const url = row.original.invoice_pdf_url
        // Only a real stored file is openable; drafts are null and finalize writes
        // an "s3-pending://" marker until the backend renders PDFs (TODO.md).
        if (!url?.startsWith("http")) {
          return <span className="text-xs text-muted-foreground">{url ? "PDF pending" : "—"}</span>
        }
        return (
          <Button asChild variant="outline" size="sm">
            {/* stopPropagation: the row itself opens the invoice detail page. */}
            <a href={url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
              <FileTextIcon />
              View
            </a>
          </Button>
        )
      },
    },
  ]

  return (
    <>
      <PageHeader title="Invoices" description="Revenue lands in the invoice-date month, split across projects like its PO.">
        {isSuperAdmin && (
          <Button onClick={() => setCreating(true)}>
            <PlusIcon />
            New invoice
          </Button>
        )}
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3 px-4 lg:px-6">
        <FilterSelect
          value={status}
          onChange={(v) => {
            setStatus(v)
            pagination.reset()
          }}
          allLabel="All statuses"
          options={options(INVOICE_STATUSES)}
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
        data={invoices.data}
        isLoading={invoices.isLoading}
        error={invoices.error}
        emptyMessage="No invoices found."
        onRowClick={(inv) => navigate(`/invoices/${inv.id}`)}
        pagination={pagination}
      />

      {creating && isSuperAdmin && (
        <CreateInvoiceDialog
          onClose={() => setCreating(false)}
          onCreated={(inv) => navigate(`/invoices/${inv.id}`)}
        />
      )}
    </>
  )
}

const invoiceSchema = z
  .object({
    client_id: idRequired,
    project_id: idRequired,
    po_id: idRequired,
    invoice_date: dateRequired,
    invoice_value: moneyRequired.refine((v) => Number(v) > 0, "Must be more than 0"),
    client_tds_amount: moneyOptional,
    invoice_number: textOptional,
    custom_split: z.boolean(),
    allocations: z.array(allocationRowSchema),
    value_override: z.boolean(),
    override_remarks: textOptional,
  })
  .refine((v) => !v.value_override || v.override_remarks, {
    path: ["override_remarks"],
    message: "Explain why the value is overridden",
  })
  .refine((v) => !v.custom_split || v.allocations.length > 0, {
    path: ["allocations"],
    message: "Add at least one project",
  })

type InvoiceFormInput = z.input<typeof invoiceSchema>

/** Raise an invoice: client → project → PO cascade (FRONTEND.md §4), then autofill. */
function CreateInvoiceDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (inv: Invoice) => void }) {
  const isSuperAdmin = useIsSuperAdmin()
  const autoNumber = useSettingsMap().get("invoice_auto_number") === "true"
  const form = useForm<InvoiceFormInput, unknown, z.output<typeof invoiceSchema>>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      client_id: null as unknown as number,
      project_id: null as unknown as number,
      po_id: null as unknown as number,
      invoice_date: "",
      invoice_value: "",
      client_tds_amount: "",
      invoice_number: "",
      custom_split: false,
      allocations: [],
      value_override: false,
      override_remarks: "",
    },
  })
  const [clientId, projectId, poId, invoiceValue, customSplit, valueOverride] = useWatch({
    control: form.control,
    name: ["client_id", "project_id", "po_id", "invoice_value", "custom_split", "value_override"],
  })

  // Autofill sources: client master + PO detail.
  const client = $api.useQuery(
    "get",
    "/clients/{client_id}",
    { params: { path: { client_id: clientId ?? 0 } } },
    { enabled: !!clientId }
  )
  const po = $api.useQuery("get", "/pos/{po_id}", { params: { path: { po_id: poId ?? 0 } } }, { enabled: !!poId })
  const today = toApiDate(new Date())
  const nilTds =
    !!client.data?.nil_tds_cert &&
    (!client.data.nil_tds_cert_valid_till || client.data.nil_tds_cert_valid_till >= today)

  const create = $api.useMutation("post", "/invoices", {
    onSuccess: (inv) => {
      onClose()
      onCreated(inv)
    },
  })

  return (
    <FormDialog
      open
      wide
      onOpenChange={(open) => !open && onClose()}
      title="New invoice"
      description="Saved as a draft. A super admin finalizes it, which assigns the number and locks it."
      submitLabel="Create draft"
      isPending={create.isPending}
      onSubmit={form.handleSubmit((v) =>
        create.mutate({
          body: {
            po_id: v.po_id,
            invoice_date: v.invoice_date,
            invoice_value: v.invoice_value,
            client_tds_amount: nilTds ? "0" : v.client_tds_amount,
            invoice_number: autoNumber ? null : v.invoice_number,
            allocations: v.custom_split ? toApiAllocations(v.allocations, "allocated_value") : null,
            value_override: isSuperAdmin && v.value_override,
            override_remarks: isSuperAdmin && v.value_override ? v.override_remarks : null,
          },
        })
      )}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <LookupField
          control={form.control}
          name="client_id"
          label="Client"
          useItems={useClientLookup}
          placeholder="Search client…"
          onSelect={() => {
            form.setValue("project_id", null as unknown as number)
            form.setValue("po_id", null as unknown as number)
          }}
        />
        <LookupField
          control={form.control}
          name="project_id"
          label="Project"
          useItems={projectLookup(clientId)}
          placeholder={clientId ? "Search project…" : "Pick a client first"}
          disabled={!clientId}
          onSelect={() => form.setValue("po_id", null as unknown as number)}
        />
        <LookupField
          control={form.control}
          name="po_id"
          label="Purchase order"
          useItems={poLookup(projectId)}
          placeholder={projectId ? "Pick PO…" : "Pick a project first"}
          disabled={!projectId}
        />
      </div>

      {client.data && (
        <Alert>
          <AlertTitle>{client.data.legal_name}</AlertTitle>
          <AlertDescription>
            GSTIN {client.data.gstin ?? "—"} · PAN {client.data.pan ?? "—"} · Terms {client.data.default_payment_terms_days} days
            {client.data.billing_address && <div>{client.data.billing_address}</div>}
          </AlertDescription>
        </Alert>
      )}
      {po.data && (
        <Alert>
          <AlertTitle>
            PO {po.data.po_number} · {formatINR(po.data.po_value)} · {humanize(po.data.status)}
          </AlertTitle>
          <AlertDescription>
            Payment terms {po.data.agreed_payment_terms_days} days.
            {!po.data.is_allocation_balanced && " This PO's project split isn't balanced yet — balance and lock it before invoicing."}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <DateField control={form.control} name="invoice_date" label="Invoice date" />
        <MoneyField control={form.control} name="invoice_value" label="Invoice value" />
        <MoneyField
          control={form.control}
          name="client_tds_amount"
          label="Client TDS"
          disabled={nilTds}
          description={nilTds ? "Nil-TDS certificate active — forced to 0." : undefined}
        />
      </div>
      {!autoNumber && (
        <TextField
          control={form.control}
          name="invoice_number"
          label="Invoice number"
          description="Optional — leave blank to set it later."
        />
      )}

      <SwitchField
        control={form.control}
        name="custom_split"
        label="Custom project split"
        description="Off = inherit the PO's split pro-rata."
      />
      {customSplit && (
        <AllocationRows control={form.control} name="allocations" total={invoiceValue} clientId={clientId} />
      )}

      {isSuperAdmin && (
        <>
          <SwitchField
            control={form.control}
            name="value_override"
            label="Value override"
            description="Super admin only. Requires remarks; audit-logged."
          />
          {valueOverride && <TextareaField control={form.control} name="override_remarks" label="Override remarks" />}
        </>
      )}
    </FormDialog>
  )
}
