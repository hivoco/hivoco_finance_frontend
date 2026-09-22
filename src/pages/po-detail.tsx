import { zodResolver } from "@hookform/resolvers/zod"
import { LockIcon } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"
import { useNavigate, useParams } from "react-router"
import { toast } from "sonner"
import { z } from "zod"

import {
  AllocationRows,
  allocationRowSchema,
  toApiAllocations,
} from "@/components/allocation-rows"
import { ConfirmButton } from "@/components/confirm-button"
import { DataTable, type Columns } from "@/components/data-table"
import { DetailCard } from "@/components/detail-list"
import { FileUploadButton, StoredFileLabel } from "@/components/file-upload-button"
import { PageHeader } from "@/components/page-header"
import { QueryState } from "@/components/query-state"
import { Section } from "@/components/section"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FieldGroup } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useCanEdit } from "@/hooks/use-current-user"
import { useClientNames, useProjectNames } from "@/hooks/use-name-maps"
import { $api } from "@/lib/api/client"
import type { components } from "@/lib/api/schema"
import { formatDate, formatINR } from "@/lib/format"

type PO = components["schemas"]["POOut"]
type Invoice = components["schemas"]["InvoiceOut"]

export function PoDetailPage() {
  const canEdit = useCanEdit()
  const poId = Number(useParams().id)
  const navigate = useNavigate()
  const clientName = useClientNames()
  const path = { params: { path: { po_id: poId } } }

  const po = $api.useQuery("get", "/pos/{po_id}", path)
  const invoices = $api.useQuery(
    "get",
    "/invoices",
    { params: { query: { po_id: poId, limit: 200 } } },
    { enabled: po.isSuccess }
  )
  const upload = $api.useMutation("post", "/pos/{po_id}/upload", {
    onSuccess: () => toast.success("PO document uploaded"),
  })
  const lock = $api.useMutation("post", "/pos/{po_id}/lock", { onSuccess: () => toast.success("PO locked") })

  if (!po.data) return <QueryState isLoading={po.isLoading} error={po.error} />
  const p = po.data
  const isOpen = p.status === "open"

  const invoiceColumns: Columns<Invoice> = [
    { header: "Invoice", cell: ({ row }) => <span className="font-bold">{row.original.invoice_number ?? "Draft"}</span> },
    { header: "Date", cell: ({ row }) => formatDate(row.original.invoice_date) },
    { header: "Value", cell: ({ row }) => <span className="tabular-nums">{formatINR(row.original.invoice_value)}</span> },
    { header: "Status", cell: ({ row }) => <StatusBadge value={row.original.status} /> },
    { header: "Payment", cell: ({ row }) => <StatusBadge value={row.original.payment_status} /> },
  ]

  return (
    <>
      <PageHeader
        title={p.po_number}
        description={
          <span className="inline-flex items-center gap-2">
            {clientName(p.client_id)} <StatusBadge value={p.status} />
          </span>
        }
      >
        {canEdit && (
          <FileUploadButton
            isPending={upload.isPending}
            onFile={(formData) =>
              upload.mutate({ ...path, body: formData as unknown as { file: string } })
            }
          >
            {p.po_document_url ? "Replace document" : "Upload PO document"}
          </FileUploadButton>
        )}
        {isOpen && canEdit && (
          <ConfirmButton
            title="Lock this PO?"
            description="Locking freezes the project split. The split must add up to the PO value."
            confirmLabel="Lock PO"
            onConfirm={() => lock.mutate(path)}
            isPending={lock.isPending}
            disabled={!p.is_allocation_balanced}
          >
            <LockIcon />
            Lock
          </ConfirmButton>
        )}
      </PageHeader>

      <div className="px-4 lg:px-6">
        <DetailCard
          title="Details"
          items={[
            { label: "Client", value: clientName(p.client_id) },
            { label: "PO date", value: formatDate(p.po_date) },
            { label: "PO value", value: formatINR(p.po_value) },
            { label: "Payment terms", value: `${p.agreed_payment_terms_days} days` },
            { label: "PO document", value: <StoredFileLabel url={p.po_document_url} /> },
            { label: "Split", value: p.is_allocation_balanced ? "Balanced" : "Not balanced" },
          ]}
        />
      </div>

      <div className="px-4 lg:px-6">
        {isOpen && canEdit ? <AllocationEditor po={p} /> : <AllocationTable po={p} />}
      </div>

      <Section title="Invoices against this PO">
        <DataTable
          columns={invoiceColumns}
          data={invoices.data}
          isLoading={invoices.isLoading}
          error={invoices.error}
          emptyMessage="No invoices raised yet."
          onRowClick={(inv) => navigate(`/invoices/${inv.id}`)}
        />
      </Section>
    </>
  )
}

const splitSchema = z.object({ allocations: z.array(allocationRowSchema).min(1, "Add at least one project") })

/** PUT /pos/{id}/allocations replaces the split; response drives the balance badge. */
function AllocationEditor({ po }: { po: PO }) {
  const form = useForm<z.input<typeof splitSchema>, unknown, z.output<typeof splitSchema>>({
    resolver: zodResolver(splitSchema),
    defaultValues: {
      allocations: po.allocations.map((a) => ({
        project_id: a.project_id,
        amount: a.allocated_value,
        remarks: a.remarks ?? "",
      })),
    },
  })
  const clientRows = useWatch({ control: form.control, name: "allocations" })
  const save = $api.useMutation("put", "/pos/{po_id}/allocations", {
    onSuccess: (result) =>
      result.is_balanced
        ? toast.success("Split saved — balanced, ready to lock")
        : toast.warning(`Split saved — difference ${formatINR(result.difference)}`),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project split</CardTitle>
        <CardDescription>Allocations must add up to the PO value before the PO can lock.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={form.handleSubmit(({ allocations }) =>
            save.mutate({
              params: { path: { po_id: po.id } },
              body: toApiAllocations(allocations, "allocated_value"),
            })
          )}
        >
          <FieldGroup>
            <AllocationRows control={form.control} name="allocations" total={po.po_value} clientId={po.client_id} />
            <div>
              <Button type="submit" disabled={save.isPending || clientRows.length === 0}>
                {save.isPending && <Spinner />}
                Save split
              </Button>
            </div>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}

function AllocationTable({ po }: { po: PO }) {
  const projectName = useProjectNames()
  return (
    <Card>
      <CardHeader>
        <CardTitle>Project split</CardTitle>
        <CardDescription>
          {po.status === "open" ? "Read-only for your role." : "Locked — the split can no longer change."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead className="text-right">Allocated</TableHead>
              <TableHead>Remarks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {po.allocations.map((a) => (
              <TableRow key={a.id}>
                <TableCell>{projectName(a.project_id)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatINR(a.allocated_value)}</TableCell>
                <TableCell className="text-muted-foreground">{a.remarks ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
