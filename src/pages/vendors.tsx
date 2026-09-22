import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { PencilIcon, PlusIcon, SearchIcon } from "lucide-react"
import { useForm } from "react-hook-form"
import { useDebounce } from "use-debounce"
import { z } from "zod"

import { DataTable, useOffsetPagination, type Columns } from "@/components/data-table"
import { FormDialog } from "@/components/form-dialog"
import { SelectField, SwitchField, TextField } from "@/components/form-fields"
import { PageHeader } from "@/components/page-header"
import { BoolBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useIsSuperAdmin } from "@/hooks/use-current-user"
import { normalizePct, useTdsSlabOptions } from "@/hooks/use-settings"
import { $api } from "@/lib/api/client"
import { options, VENDOR_CATEGORIES } from "@/lib/enums"
import type { components } from "@/lib/api/schema"
import { humanize } from "@/lib/format"
import { codeOptional, termsDaysRequired, textRequired } from "@/lib/schemas"

type Vendor = components["schemas"]["VendorOut"]

export function VendorsPage() {
  const isSuperAdmin = useIsSuperAdmin()
  const [search, setSearch] = React.useState("")
  const [q] = useDebounce(search, 300)
  const [activeOnly, setActiveOnly] = React.useState(true)
  const pagination = useOffsetPagination()
  const [editing, setEditing] = React.useState<Vendor | "new" | null>(null)

  const vendors = $api.useQuery("get", "/vendors", {
    params: {
      query: { q: q || undefined, active_only: activeOnly, limit: pagination.limit, offset: pagination.offset },
    },
  })

  const columns: Columns<Vendor> = [
    { header: "Vendor", cell: ({ row }) => <span className="font-bold">{row.original.vendor_name}</span> },
    { header: "Category", cell: ({ row }) => humanize(row.original.category) },
    { header: "Default TDS", cell: ({ row }) => `${normalizePct(row.original.default_tds_slab_pct)}%` },
    { header: "PAN", cell: ({ row }) => row.original.pan ?? "—" },
    { header: "GSTIN", cell: ({ row }) => row.original.gstin ?? "—" },
    { header: "Terms", cell: ({ row }) => `${row.original.default_payment_terms_days} days` },
    { header: "Status", cell: ({ row }) => <BoolBadge value={row.original.is_active} yes="Active" no="Inactive" /> },
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
      <PageHeader title="Vendors" description="Subcontractors and professionals — default TDS slab and terms.">
        {isSuperAdmin && (
          <Button onClick={() => setEditing("new")}>
            <PlusIcon />
            New vendor
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
            id="vendors-active-only"
            checked={activeOnly}
            onCheckedChange={(v) => {
              setActiveOnly(v)
              pagination.reset()
            }}
          />
          <Label htmlFor="vendors-active-only">Active only</Label>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={vendors.data}
        isLoading={vendors.isLoading}
        error={vendors.error}
        emptyMessage={q ? "No vendors match your search." : "No vendors yet."}
        pagination={pagination}
      />

      {editing && (
        <VendorFormDialog vendorId={editing === "new" ? null : editing.id} onClose={() => setEditing(null)} />
      )}
    </>
  )
}

const vendorSchema = z.object({
  vendor_name: textRequired.max(190),
  pan: codeOptional.pipe(z.string().length(10, "PAN is 10 characters").nullable()),
  gstin: codeOptional.pipe(z.string().length(15, "GSTIN is 15 characters").nullable()),
  default_tds_slab_pct: z.string().min(1, "Pick a TDS slab"),
  category: z.enum(["contractor", "professional"]),
  default_payment_terms_days: termsDaysRequired,
  is_active: z.boolean(),
})

type VendorFormInput = z.input<typeof vendorSchema>

function VendorFormDialog({ vendorId, onClose }: { vendorId: number | null; onClose: () => void }) {
  const isEdit = vendorId !== null
  const tdsOptions = useTdsSlabOptions()
  const detail = $api.useQuery(
    "get",
    "/vendors/{vendor_id}",
    { params: { path: { vendor_id: vendorId ?? 0 } } },
    { enabled: isEdit }
  )

  const form = useForm<VendorFormInput, unknown, z.output<typeof vendorSchema>>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      vendor_name: "",
      pan: "",
      gstin: "",
      default_tds_slab_pct: "2",
      category: "contractor",
      default_payment_terms_days: 45,
      is_active: true,
    },
  })

  const { reset } = form
  React.useEffect(() => {
    const v = detail.data
    if (!v) return
    reset({
      vendor_name: v.vendor_name,
      pan: v.pan ?? "",
      gstin: v.gstin ?? "",
      default_tds_slab_pct: normalizePct(v.default_tds_slab_pct),
      category: v.category as "contractor" | "professional",
      default_payment_terms_days: v.default_payment_terms_days,
      is_active: v.is_active,
    })
  }, [detail.data, reset])

  const create = $api.useMutation("post", "/vendors", { onSuccess: onClose })
  const update = $api.useMutation("put", "/vendors/{vendor_id}", { onSuccess: onClose })

  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={isEdit ? "Edit vendor" : "New vendor"}
      description="The default TDS slab pre-fills vendor invoices for this vendor."
      submitLabel={isEdit ? "Save changes" : "Create vendor"}
      isPending={create.isPending || update.isPending}
      onSubmit={form.handleSubmit(({ is_active, ...body }) => {
        if (isEdit) {
          update.mutate({ params: { path: { vendor_id: vendorId } }, body: { ...body, is_active } })
        } else {
          create.mutate({ body })
        }
      })}
    >
      <TextField control={form.control} name="vendor_name" label="Vendor name" />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField control={form.control} name="category" label="Category" options={options(VENDOR_CATEGORIES)} />
        <SelectField control={form.control} name="default_tds_slab_pct" label="Default TDS slab" options={tdsOptions} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField control={form.control} name="pan" label="PAN" maxLength={10} className="uppercase" />
        <TextField control={form.control} name="gstin" label="GSTIN" maxLength={15} className="uppercase" />
      </div>
      <TextField
        control={form.control}
        name="default_payment_terms_days"
        label="Payment terms (days)"
        type="number"
        min={0}
        max={365}
      />
      {isEdit && (
        <SwitchField
          control={form.control}
          name="is_active"
          label="Active"
          description="Inactive vendors are hidden from dropdowns."
        />
      )}
    </FormDialog>
  )
}
