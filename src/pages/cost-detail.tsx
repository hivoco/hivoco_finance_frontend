import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import Decimal from "decimal.js"
import { FileCheckIcon, IndianRupeeIcon, ShieldCheckIcon } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"
import { Link, useParams } from "react-router"
import { toast } from "sonner"
import { z } from "zod"

import { DetailCard } from "@/components/detail-list"
import { FileUploadButton, StoredFileLabel } from "@/components/file-upload-button"
import { FormDialog } from "@/components/form-dialog"
import { DateField, MoneyField, SelectField, TextareaField, TextField } from "@/components/form-fields"
import { PageHeader } from "@/components/page-header"
import { QueryState } from "@/components/query-state"
import { StatusBadge } from "@/components/status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useCanEdit, useCurrentUser } from "@/hooks/use-current-user"
import { useProjectNames, useUserNames, useVendorNames } from "@/hooks/use-name-maps"
import { normalizePct, useTdsSlabOptions } from "@/hooks/use-settings"
import { $api } from "@/lib/api/client"
import type { components } from "@/lib/api/schema"
import { formatDate, formatDateTime, formatINR } from "@/lib/format"
import { dateRequired, moneyRequired, termsDaysOptional, textOptional } from "@/lib/schemas"

type Cost = components["schemas"]["CostOut"]

export function CostDetailPage() {
  const canEdit = useCanEdit()
  const costId = Number(useParams().id)
  const { data: me } = useCurrentUser()
  const vendorName = useVendorNames()
  const projectName = useProjectNames()
  const userName = useUserNames()
  const [dialog, setDialog] = React.useState<"vendor-invoice" | "signoff" | "payment" | null>(null)
  const path = { params: { path: { cost_id: costId } } }

  const cost = $api.useQuery("get", "/costs/{cost_id}", path)
  const upload = $api.useMutation("post", "/costs/{cost_id}/upload", {
    onSuccess: () => toast.success("Vendor invoice file uploaded"),
  })

  if (!cost.data) return <QueryState isLoading={cost.isLoading} error={cost.error} />
  const c = cost.data
  const isSuperAdmin = me?.role === "super_admin"
  const signedByMe = c.signoffs.some((s) => s.signed_by === me?.id)
  const signoffCount = Math.min(c.signoffs.length, 2)

  return (
    <>
      <PageHeader
        title={`Cost #${c.id} · ${vendorName(c.vendor_id)}`}
        description={
          <span className="inline-flex items-center gap-2">
            <Badge variant={c.is_provisional ? "outline" : "secondary"}>{c.is_provisional ? "Tentative" : "Final"}</Badge>
            <StatusBadge value={c.payment_status} />
          </span>
        }
      >
        {canEdit && !c.payment_processed && (
          <Button variant="outline" onClick={() => setDialog("vendor-invoice")}>
            <FileCheckIcon />
            {c.is_provisional ? "Add vendor invoice" : "Update vendor invoice"}
          </Button>
        )}
        {canEdit && (
          <FileUploadButton
            isPending={upload.isPending}
            onFile={(formData) => upload.mutate({ ...path, body: formData as unknown as { file: string } })}
          >
            {c.vendor_invoice_url ? "Replace file" : "Upload invoice file"}
          </FileUploadButton>
        )}
        {canEdit && c.payment_status !== "paid" && (
          <Button onClick={() => setDialog("payment")} disabled={!c.payment_processed}>
            <IndianRupeeIcon />
            Pay
          </Button>
        )}
      </PageHeader>

      <div className="px-4 lg:px-6">
        <DetailCard
          title="Cost"
          items={[
            { label: "Vendor", value: vendorName(c.vendor_id) },
            { label: "Tentative amount", value: formatINR(c.tentative_amount) },
            { label: "Final amount", value: formatINR(c.final_amount) },
            { label: "TDS", value: c.tds_slab_pct ? `${normalizePct(c.tds_slab_pct)}% · ${formatINR(c.tds_amount)}` : "—" },
            { label: "Net payable", value: formatINR(c.net_payable) },
            { label: "Vendor invoice date", value: formatDate(c.vendor_invoice_date) },
            { label: "Expected payment", value: formatDate(c.expected_payment_date) },
            { label: "Paid on", value: formatDate(c.actual_payment_date) },
            { label: "Invoice file", value: <StoredFileLabel url={c.vendor_invoice_url} /> },
          ]}
        />
      </div>

      <div className="grid gap-4 px-4 lg:px-6 @5xl/main:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Payment sign-off</CardTitle>
            <CardDescription>2 approvals from different super admins are required before payment.</CardDescription>
            <CardAction>
              <Badge variant={c.payment_processed ? "default" : "outline"}>{signoffCount}/2 approvals</Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {c.signoffs.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Signed by</TableHead>
                    <TableHead>When</TableHead>
                    <TableHead>Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {c.signoffs.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>{s.signed_by === me?.id ? "You" : userName(s.signed_by)}</TableCell>
                      <TableCell>{formatDateTime(s.signed_at)}</TableCell>
                      <TableCell className="text-muted-foreground">{s.remarks ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">No approvals yet.</p>
            )}
            {isSuperAdmin && !c.payment_processed && (
              <div>
                <Button onClick={() => setDialog("signoff")} disabled={signedByMe}>
                  <ShieldCheckIcon />
                  {signedByMe ? "You've signed off" : "Sign off"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {c.allocations.length > 0 ? (
                  c.allocations.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <Link to={`/projects/${a.project_id}`} className="underline-offset-4 hover:underline">
                          {projectName(a.project_id)}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatINR(a.allocated_amount)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell>
                      {c.project_id ? (
                        <Link to={`/projects/${c.project_id}`} className="underline-offset-4 hover:underline">
                          {projectName(c.project_id)}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatINR(c.final_amount ?? c.tentative_amount)}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {dialog === "vendor-invoice" && <VendorInvoiceDialog cost={c} onClose={() => setDialog(null)} />}
      {dialog === "signoff" && <SignoffDialog cost={c} onClose={() => setDialog(null)} />}
      {dialog === "payment" && <CostPaymentDialog cost={c} onClose={() => setDialog(null)} />}
    </>
  )
}

const vendorInvoiceSchema = z.object({
  final_amount: moneyRequired,
  tds_slab_pct: z.string().min(1, "Pick a TDS slab"),
  vendor_invoice_date: dateRequired,
  payment_terms_days: termsDaysOptional,
})

function VendorInvoiceDialog({ cost, onClose }: { cost: Cost; onClose: () => void }) {
  const tdsOptions = useTdsSlabOptions()
  const vendor = $api.useQuery("get", "/vendors/{vendor_id}", { params: { path: { vendor_id: cost.vendor_id } } })
  const form = useForm<z.input<typeof vendorInvoiceSchema>, unknown, z.output<typeof vendorInvoiceSchema>>({
    resolver: zodResolver(vendorInvoiceSchema),
    defaultValues: {
      final_amount: cost.final_amount ?? cost.tentative_amount,
      tds_slab_pct: normalizePct(cost.tds_slab_pct),
      vendor_invoice_date: cost.vendor_invoice_date ?? "",
      payment_terms_days: "",
    },
  })

  // Default TDS slab + terms from the vendor master when not set yet.
  const { getValues, setValue } = form
  React.useEffect(() => {
    if (!vendor.data) return
    if (!getValues("tds_slab_pct")) setValue("tds_slab_pct", normalizePct(vendor.data.default_tds_slab_pct))
    if (!getValues("payment_terms_days")) setValue("payment_terms_days", String(vendor.data.default_payment_terms_days))
  }, [vendor.data, getValues, setValue])

  const [finalAmount, pct] = useWatch({ control: form.control, name: ["final_amount", "tds_slab_pct"] })
  let preview: { tds: string; net: string } | null = null
  try {
    const amount = new Decimal(finalAmount || 0)
    const tds = amount.times(new Decimal(pct || 0)).dividedBy(100).toDecimalPlaces(2)
    preview = { tds: tds.toFixed(2), net: amount.minus(tds).toFixed(2) }
  } catch {
    preview = null
  }

  const submit = $api.useMutation("post", "/costs/{cost_id}/vendor-invoice", { onSuccess: onClose })

  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title="Vendor invoice"
      description="Makes the cost final and computes TDS and net payable."
      isPending={submit.isPending}
      onSubmit={form.handleSubmit((body) => submit.mutate({ params: { path: { cost_id: cost.id } }, body }))}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <MoneyField control={form.control} name="final_amount" label="Final amount" />
        <SelectField control={form.control} name="tds_slab_pct" label="TDS slab" options={tdsOptions} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <DateField control={form.control} name="vendor_invoice_date" label="Vendor invoice date" />
        <TextField
          control={form.control}
          name="payment_terms_days"
          label="Payment terms (days)"
          type="number"
          min={0}
          max={365}
        />
      </div>
      {preview && (
        <p className="text-sm text-muted-foreground">
          TDS <span className="font-bold text-foreground tabular-nums">{formatINR(preview.tds)}</span> · Net payable{" "}
          <span className="font-bold text-foreground tabular-nums">{formatINR(preview.net)}</span>
        </p>
      )}
    </FormDialog>
  )
}

const signoffSchema = z.object({ remarks: textOptional })

function SignoffDialog({ cost, onClose }: { cost: Cost; onClose: () => void }) {
  const form = useForm<z.input<typeof signoffSchema>, unknown, z.output<typeof signoffSchema>>({
    resolver: zodResolver(signoffSchema),
    defaultValues: { remarks: "" },
  })
  const signoff = $api.useMutation("post", "/costs/{cost_id}/signoff", {
    onSuccess: (c) => {
      toast.success(c.payment_processed ? "Second approval — payment can be processed" : "Approved — one more needed")
      onClose()
    },
  })

  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title="Sign off payment"
      description={`Approve paying ${formatINR(cost.net_payable ?? cost.tentative_amount)}. Two different super admins must approve.`}
      submitLabel="Approve"
      isPending={signoff.isPending}
      onSubmit={form.handleSubmit((body) => signoff.mutate({ params: { path: { cost_id: cost.id } }, body }))}
    >
      <TextareaField control={form.control} name="remarks" label="Remarks (optional)" />
    </FormDialog>
  )
}

const costPaymentSchema = z.object({
  paid_amount: moneyRequired,
  actual_payment_date: dateRequired,
})

function CostPaymentDialog({ cost, onClose }: { cost: Cost; onClose: () => void }) {
  const form = useForm<z.input<typeof costPaymentSchema>>({
    resolver: zodResolver(costPaymentSchema),
    defaultValues: { paid_amount: cost.net_payable ?? "", actual_payment_date: "" },
  })
  const pay = $api.useMutation("post", "/costs/{cost_id}/payment", { onSuccess: onClose })

  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title="Record vendor payment"
      description={`Net payable ${formatINR(cost.net_payable)}.`}
      submitLabel="Record payment"
      isPending={pay.isPending}
      onSubmit={form.handleSubmit((body) => pay.mutate({ params: { path: { cost_id: cost.id } }, body }))}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <MoneyField control={form.control} name="paid_amount" label="Amount paid" />
        <DateField control={form.control} name="actual_payment_date" label="Payment date" />
      </div>
    </FormDialog>
  )
}
