import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { PencilIcon } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { DataTable, type Columns } from "@/components/data-table"
import { FormDialog } from "@/components/form-dialog"
import { SelectField, TextField, type Option } from "@/components/form-fields"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { useIsSuperAdmin } from "@/hooks/use-current-user"
import { $api } from "@/lib/api/client"
import type { components } from "@/lib/api/schema"
import { formatDateTime, humanize } from "@/lib/format"

type Setting = components["schemas"]["SettingOut"]

// Known keys (FRONTEND.md §5 Settings) → input type. The backend validates too.
const CHOICES: Record<string, Option[]> = {
  overhead_split_method: ["equal", "revenue_share", "headcount", "UNSET"].map((v) => ({ value: v, label: v === "UNSET" ? "Not set" : humanize(v) })),
  lock_granularity: ["per_project_month", "company_wide"].map((v) => ({ value: v, label: humanize(v) })),
  invoice_auto_number: [
    { value: "true", label: "Yes — auto-sequence" },
    { value: "false", label: "No — enter manually" },
  ],
}
const NUMERIC = new Set([
  "sla_days_initiated_no_po",
  "sla_days_po_no_invoice",
  "financial_year_start_month",
  "allocation_rounding_tolerance",
])

export function SettingsPage() {
  const isSuperAdmin = useIsSuperAdmin()
  const settings = $api.useQuery("get", "/settings")
  const [editing, setEditing] = React.useState<Setting | null>(null)

  const columns: Columns<Setting> = [
    {
      header: "Setting",
      cell: ({ row }) => (
        <div>
          <div className="font-bold">{humanize(row.original.config_key)}</div>
          <code className="text-xs text-muted-foreground">{row.original.config_key}</code>
        </div>
      ),
    },
    {
      header: "Value",
      cell: ({ row }) => {
        const choice = CHOICES[row.original.config_key]?.find((o) => o.value === row.original.config_value)
        return <span>{choice?.label ?? row.original.config_value}</span>
      },
    },
    { header: "Notes", cell: ({ row }) => <span className="text-muted-foreground">{row.original.notes ?? "—"}</span> },
    { header: "Updated", cell: ({ row }) => formatDateTime(row.original.updated_at) },
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
      <PageHeader
        title="Settings"
        description={isSuperAdmin ? "Live configuration — changes are validated and audit-logged." : "Live configuration (read-only)."}
      />
      <DataTable columns={columns} data={settings.data} isLoading={settings.isLoading} error={settings.error} emptyMessage="No settings." />
      {editing && <SettingDialog setting={editing} onClose={() => setEditing(null)} />}
    </>
  )
}

const settingSchema = z.object({ config_value: z.string().trim().min(1, "Required") })

function SettingDialog({ setting, onClose }: { setting: Setting; onClose: () => void }) {
  const form = useForm<z.input<typeof settingSchema>>({
    resolver: zodResolver(settingSchema),
    defaultValues: { config_value: setting.config_value },
  })
  const update = $api.useMutation("put", "/settings/{key}", { onSuccess: onClose })
  const choices = CHOICES[setting.config_key]

  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={humanize(setting.config_key)}
      description={setting.notes ?? undefined}
      isPending={update.isPending}
      onSubmit={form.handleSubmit((body) => update.mutate({ params: { path: { key: setting.config_key } }, body }))}
    >
      {choices ? (
        <SelectField control={form.control} name="config_value" label="Value" options={choices} />
      ) : (
        <TextField
          control={form.control}
          name="config_value"
          label="Value"
          inputMode={NUMERIC.has(setting.config_key) ? "decimal" : undefined}
          description={setting.config_key === "tds_slab_options" ? "Comma-separated percentages, e.g. 2,10" : undefined}
        />
      )}
    </FormDialog>
  )
}
