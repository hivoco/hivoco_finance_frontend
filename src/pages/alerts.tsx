import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { CheckIcon, RadarIcon } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { DataTable, useOffsetPagination, type Columns } from "@/components/data-table"
import { EntityLink } from "@/components/entity-link"
import { ALL, FilterSelect, filterValue } from "@/components/filter-select"
import { FormDialog } from "@/components/form-dialog"
import { DateField, LookupCombobox } from "@/components/form-fields"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useIsSuperAdmin } from "@/hooks/use-current-user"
import { projectLookup } from "@/hooks/use-lookups"
import { useProjectNames, useUserNames } from "@/hooks/use-name-maps"
import { $api } from "@/lib/api/client"
import type { components } from "@/lib/api/schema"
import { ALERT_TRANSITIONS, options, type AlertTransition } from "@/lib/enums"
import { countLabel, formatDateTime } from "@/lib/format"
import { dateOptional } from "@/lib/schemas"

type Alert = components["schemas"]["AlertOut"]

const useAllProjects = projectLookup()
const YES_NO = [
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
]
const TRANSITION_LABEL = Object.fromEntries(ALERT_TRANSITIONS.map((t) => [t.value, t.label])) as Record<string, string>

function boolFilter(value: string) {
  return value === ALL ? undefined : value === "true"
}

export function AlertsPage() {
  const isSuperAdmin = useIsSuperAdmin()
  const projectName = useProjectNames()
  const userName = useUserNames()
  const [transition, setTransition] = React.useState<string>(ALL)
  const [acknowledged, setAcknowledged] = React.useState<string>("false")
  const [escalated, setEscalated] = React.useState<string>(ALL)
  const [projectId, setProjectId] = React.useState<number | null>(null)
  const [scanning, setScanning] = React.useState(false)
  const pagination = useOffsetPagination(100)

  const alerts = $api.useQuery("get", "/alerts", {
    params: {
      query: {
        transition: filterValue<AlertTransition>(transition),
        acknowledged: boolFilter(acknowledged),
        escalated: boolFilter(escalated),
        project_id: projectId ?? undefined,
        limit: pagination.limit,
        offset: pagination.offset,
      },
    },
  })
  const ack = $api.useMutation("post", "/alerts/{alert_id}/ack")

  const columns: Columns<Alert> = [
    { header: "Fired", cell: ({ row }) => formatDateTime(row.original.fired_at) },
    {
      header: "Alert",
      cell: ({ row }) => (
        <span className="font-bold">{TRANSITION_LABEL[row.original.transition] ?? row.original.transition}</span>
      ),
    },
    { header: "Record", cell: ({ row }) => <EntityLink type={row.original.entity_type} id={row.original.entity_id} /> },
    { header: "Project", cell: ({ row }) => projectName(row.original.project_id) },
    { header: "Recipient", cell: ({ row }) => userName(row.original.recipient_user_id) },
    {
      header: "Escalated",
      cell: ({ row }) => (row.original.escalated ? <Badge variant="destructive">Escalated</Badge> : "—"),
    },
    {
      id: "ack",
      header: () => <span className="sr-only">Acknowledge</span>,
      cell: ({ row }) =>
        row.original.acknowledged ? (
          <Badge variant="outline">Acknowledged {formatDateTime(row.original.acknowledged_at)}</Badge>
        ) : (
          <Button
            size="sm"
            variant="outline"
            disabled={ack.isPending && ack.variables?.params.path.alert_id === row.original.id}
            onClick={() => ack.mutate({ params: { path: { alert_id: row.original.id } } })}
          >
            <CheckIcon />
            Acknowledge
          </Button>
        ),
    },
  ]

  // Changing a filter goes back to page 1.
  const filter = (apply: () => void) => {
    apply()
    pagination.reset()
  }

  return (
    <>
      <PageHeader title="SLA alerts" description="Projects without a PO, POs without an invoice, and overdue invoices.">
        {isSuperAdmin && (
          <Button variant="outline" onClick={() => setScanning(true)}>
            <RadarIcon />
            Run SLA scan
          </Button>
        )}
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3 px-4 lg:px-6">
        <FilterSelect
          value={transition}
          onChange={(v) => filter(() => setTransition(v))}
          allLabel="All alert types"
          options={options(ALERT_TRANSITIONS)}
        />
        <FilterSelect
          value={acknowledged}
          onChange={(v) => filter(() => setAcknowledged(v))}
          allLabel="Acknowledged: any"
          options={YES_NO.map((o) => ({ ...o, label: `Acknowledged: ${o.label.toLowerCase()}` }))}
        />
        <FilterSelect
          value={escalated}
          onChange={(v) => filter(() => setEscalated(v))}
          allLabel="Escalated: any"
          options={YES_NO.map((o) => ({ ...o, label: `Escalated: ${o.label.toLowerCase()}` }))}
        />
        <LookupCombobox
          value={projectId}
          onChange={(item) => filter(() => setProjectId(item?.id ?? null))}
          useItems={useAllProjects}
          placeholder="All projects"
          className="w-56"
        />
      </div>

      <DataTable
        columns={columns}
        data={alerts.data}
        isLoading={alerts.isLoading}
        error={alerts.error}
        emptyMessage="No alerts match these filters."
        pagination={pagination}
      />

      {scanning && <RunScanDialog onClose={() => setScanning(false)} />}
    </>
  )
}

const scanSchema = z.object({ as_of: dateOptional })

function RunScanDialog({ onClose }: { onClose: () => void }) {
  const form = useForm<z.input<typeof scanSchema>, unknown, z.output<typeof scanSchema>>({
    resolver: zodResolver(scanSchema),
    defaultValues: { as_of: "" },
  })
  const run = $api.useMutation("post", "/alerts/run", {
    onSuccess: (result) => {
      toast.success(`Scan done — ${countLabel(result.total_fired, "alert")} fired, ${result.escalated} escalated`)
      onClose()
    },
  })

  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title="Run SLA scan"
      description="Checks every project, PO and invoice against the SLA thresholds in Settings and fires alerts. A cron normally does this."
      submitLabel="Run scan"
      isPending={run.isPending}
      onSubmit={form.handleSubmit(({ as_of }) => run.mutate({ params: { query: { as_of: as_of ?? undefined } } }))}
    >
      <DateField control={form.control} name="as_of" label="As of (optional)" description="Defaults to today." />
    </FormDialog>
  )
}
