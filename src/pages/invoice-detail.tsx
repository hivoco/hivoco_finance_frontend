import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import Decimal from "decimal.js"
import { BadgeCheckIcon, IndianRupeeIcon, LockIcon, PencilIcon } from "lucide-react"
import { useForm } from "react-hook-form"
import { Link, useParams } from "react-router"
import { toast } from "sonner"
import { z } from "zod"

import { ConfirmButton } from "@/components/confirm-button"
import { DetailCard } from "@/components/detail-list"
import { FileUploadButton, StoredFileLabel } from "@/components/file-upload-button"
import { FormDialog } from "@/components/form-dialog"
import { DateField, MoneyField, TextField } from "@/components/form-fields"
import { PageHeader } from "@/components/page-header"
import { QueryState } from "@/components/query-state"
import { StatusBadge } from "@/components/status-badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useIsSuperAdmin } from "@/hooks/use-current-user"
import { usePoNumbers, useProjectNames } from "@/hooks/use-name-maps"
import { $api } from "@/lib/api/client"
import type { components } from "@/lib/api/schema"
import { formatDate, formatINR } from "@/lib/format"
import { dateRequired, moneyOptional, moneyRequired, textOptional } from "@/lib/schemas"

type Invoice = components["schemas"]["InvoiceOut"]

export function InvoiceDetailPage() {
  const invoiceId = Number(useParams().id)
  const isSuperAdmin = useIsSuperAdmin()
  const poNumber = usePoNumbers()
  const projectName = useProjectNames()
  const [dialog, setDialog] = React.useState<"edit" | "payment" | null>(null)
  const path = { params: { path: { invoice_id: invoiceId } } }

  const invoice = $api.useQuery("get", "/invoices/{invoice_id}", path)
  const finalize = $api.useMutation("post", "/invoices/{invoice_id}/finalize", {
    onSuccess: (inv) => toast.success(`Finalized as ${inv.invoice_number}`),
  })
  const upload = $api.useMutation("post", "/invoices/{invoice_id}/upload", {
    onSuccess: () => toast.success("Invoice PDF uploaded"),
  })

  if (!invoice.data) return <QueryState isLoading={invoice.isLoading} error={invoice.error} />
  const inv = invoice.data
  const isDraft = inv.status === "draft"
  const hasPdf = !!inv.invoice_pdf_url?.startsWith("http")

  return (
    <>
      <PageHeader
        title={inv.invoice_number ?? `Draft invoice #${inv.id}`}
        description={
          <span className="inline-flex items-center gap-2">
            PO{" "}
            <Link to={`/pos/${inv.po_id}`} className="underline underline-offset-4">
              {poNumber(inv.po_id)}
            </Link>
            <StatusBadge value={inv.status} />
            <StatusBadge value={inv.payment_status} />
          </span>
        }
      >
        {isSuperAdmin && (
          <FileUploadButton
            accept=".pdf"
            isPending={upload.isPending}
            onFile={(formData) => upload.mutate({ ...path, body: formData as unknown as { file: string } })}
          >
            {hasPdf ? "Replace PDF" : "Upload PDF"}
          </FileUploadButton>
        )}
        {isDraft && isSuperAdmin && (
          <Button variant="outline" onClick={() => setDialog("edit")}>
            <PencilIcon />
            Edit draft
          </Button>
        )}
        {isDraft && isSuperAdmin && (
          <ConfirmButton
            title="Finalize this invoice?"
            description="Assigns the invoice number and locks the invoice — it can't be edited afterwards. Finalizing clears any uploaded PDF, so upload the PDF after this step."
            confirmLabel="Finalize"
            onConfirm={() => finalize.mutate(path)}
            isPending={finalize.isPending}
          >
            <BadgeCheckIcon />
            Finalize
          </ConfirmButton>
        )}
        {!isDraft && isSuperAdmin && inv.payment_status !== "paid" && (
          <Button onClick={() => setDialog("payment")}>
            <IndianRupeeIcon />
            Record payment
          </Button>
        )}
      </PageHeader>

      {!isDraft && (
        <div className="px-4 lg:px-6">
          <Alert>
            <LockIcon />
            <AlertTitle>Finalized</AlertTitle>
            <AlertDescription>This invoice is read-only.</AlertDescription>
          </Alert>
        </div>
      )}

      <div className="px-4 lg:px-6">
        <DetailCard
          title="Invoice"
          items={[
            { label: "Invoice date", value: formatDate(inv.invoice_date) },
            { label: "Invoice value", value: formatINR(inv.invoice_value) },
            { label: "Client TDS", value: inv.client_tds_applicable ? formatINR(inv.client_tds_amount) : "Not applicable" },
            { label: "Amount expected", value: formatINR(inv.amount_expected) },
            { label: "Expected payment", value: formatDate(inv.expected_payment_date) },
            {
              label: "PDF",
              value: hasPdf ? (
                <a href={inv.invoice_pdf_url!} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                  View PDF
                </a>
              ) : (
                <StoredFileLabel url={inv.invoice_pdf_url} />
              ),
            },
            { label: "Received", value: formatINR(inv.actual_amount_received) },
            { label: "Receipt date", value: formatDate(inv.actual_receipt_date) },
            { label: "Value override", value: inv.value_override ? inv.override_remarks || "Yes" : "No" },
          ]}
        />
      </div>

      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue by project</CardTitle>
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
                {inv.allocations.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <Link to={`/projects/${a.project_id}`} className="underline-offset-4 hover:underline">
                        {projectName(a.project_id)}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatINR(a.allocated_value)}</TableCell>
                    <TableCell className="text-muted-foreground">{a.remarks ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {dialog === "edit" && <EditDraftDialog invoice={inv} onClose={() => setDialog(null)} />}
      {dialog === "payment" && <PaymentDialog invoice={inv} onClose={() => setDialog(null)} />}
    </>
  )
}

const draftSchema = z.object({
  invoice_date: dateRequired,
  invoice_value: moneyRequired.refine((v) => Number(v) > 0, "Must be more than 0"),
  client_tds_amount: moneyOptional,
  invoice_number: textOptional,
})

function EditDraftDialog({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const form = useForm<z.input<typeof draftSchema>, unknown, z.output<typeof draftSchema>>({
    resolver: zodResolver(draftSchema),
    defaultValues: {
      invoice_date: invoice.invoice_date,
      invoice_value: invoice.invoice_value,
      client_tds_amount: invoice.client_tds_amount,
      invoice_number: invoice.invoice_number ?? "",
    },
  })
  const update = $api.useMutation("put", "/invoices/{invoice_id}")

  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title="Edit draft invoice"
      description="Changing the value re-splits it across projects and recomputes TDS."
      isPending={form.formState.isSubmitting}
      onSubmit={form.handleSubmit(async ({ client_tds_amount, ...rest }) => {
        const path = { params: { path: { invoice_id: invoice.id } } }
        // client_tds_amount is NOT NULL — a blank field means no TDS.
        const tds = client_tds_amount ?? "0"
        try {
          // Backend recomputes amount_expected from the *stored* TDS whenever
          // invoice_value is sent, then applies the new TDS (TODO.md). Save a TDS
          // change first so the recompute in the second call uses it.
          if (!new Decimal(tds).eq(invoice.client_tds_amount)) {
            await update.mutateAsync({ ...path, body: { client_tds_amount: tds } })
          }
          await update.mutateAsync({ ...path, body: rest })
          onClose()
        } catch {
          // Error toast comes from the global MutationCache handler.
        }
      })}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <DateField control={form.control} name="invoice_date" label="Invoice date" />
        <MoneyField control={form.control} name="invoice_value" label="Invoice value" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <MoneyField control={form.control} name="client_tds_amount" label="Client TDS" />
        <TextField control={form.control} name="invoice_number" label="Invoice number" />
      </div>
    </FormDialog>
  )
}

const paymentSchema = z.object({
  actual_amount_received: moneyRequired,
  actual_receipt_date: dateRequired,
})

function PaymentDialog({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const form = useForm<z.input<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      actual_amount_received: invoice.actual_amount_received ?? invoice.amount_expected ?? "",
      actual_receipt_date: invoice.actual_receipt_date ?? "",
    },
  })
  const pay = $api.useMutation("post", "/invoices/{invoice_id}/payment", { onSuccess: onClose })

  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title="Record client payment"
      description={`Amount expected ${formatINR(invoice.amount_expected)} (after TDS). Partial amounts mark it partially paid.`}
      submitLabel="Record payment"
      isPending={pay.isPending}
      onSubmit={form.handleSubmit((body) => pay.mutate({ params: { path: { invoice_id: invoice.id } }, body }))}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <MoneyField control={form.control} name="actual_amount_received" label="Amount received" />
        <DateField control={form.control} name="actual_receipt_date" label="Receipt date" />
      </div>
    </FormDialog>
  )
}
