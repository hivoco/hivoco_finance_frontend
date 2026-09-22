import * as React from "react"
import { useDebounce } from "use-debounce"

import { DataTable, useOffsetPagination, type Columns } from "@/components/data-table"
import { EntityLink } from "@/components/entity-link"
import { ALL, FilterSelect, filterValue } from "@/components/filter-select"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useUserNames } from "@/hooks/use-name-maps"
import { $api } from "@/lib/api/client"
import type { components } from "@/lib/api/schema"
import { formatDateTime, humanize } from "@/lib/format"

type AuditRow = components["schemas"]["AuditOut"]

// Values the backend writes today (audit.log call sites).
const ENTITY_TYPES = ["client_invoice", "external_cost", "month_lock", "app_settings", "user"].map((v) => ({
  value: v,
  label: humanize(v),
}))
const ACTIONS = ["create", "update", "lock", "unlock", "signoff", "value_override"].map((v) => ({
  value: v,
  label: humanize(v),
}))

export function AuditPage() {
  const userName = useUserNames()
  const [entityType, setEntityType] = React.useState<string>(ALL)
  const [action, setAction] = React.useState<string>(ALL)
  const [entityIdText, setEntityIdText] = React.useState("")
  const [entityId] = useDebounce(entityIdText, 300)
  const pagination = useOffsetPagination(100)

  const audit = $api.useQuery("get", "/audit", {
    params: {
      query: {
        entity_type: filterValue(entityType),
        action: filterValue(action),
        entity_id: entityId ? Number(entityId) : undefined,
        limit: pagination.limit,
        offset: pagination.offset,
      },
    },
  })

  const filter = (apply: () => void) => {
    apply()
    pagination.reset()
  }

  const columns: Columns<AuditRow> = [
    { header: "When", cell: ({ row }) => <span className="whitespace-nowrap">{formatDateTime(row.original.changed_at)}</span> },
    { header: "Who", cell: ({ row }) => userName(row.original.changed_by) },
    { header: "Record", cell: ({ row }) => <EntityLink type={row.original.entity_type} id={row.original.entity_id} /> },
    { header: "Action", cell: ({ row }) => <Badge variant="outline">{humanize(row.original.action)}</Badge> },
    { header: "Field", cell: ({ row }) => row.original.field_name ?? "—" },
    {
      header: "Change",
      cell: ({ row }) =>
        row.original.old_value || row.original.new_value ? (
          <span className="text-sm">
            <span className="text-muted-foreground line-through">{row.original.old_value ?? "∅"}</span>
            {" → "}
            <span>{row.original.new_value ?? "∅"}</span>
          </span>
        ) : (
          "—"
        ),
    },
    { header: "Reason", cell: ({ row }) => row.original.reason ?? "—" },
  ]

  return (
    <>
      <PageHeader title="Audit log" description="Append-only trail of overrides, locks, sign-offs and admin changes." />

      <div className="flex flex-wrap items-center gap-3 px-4 lg:px-6">
        <FilterSelect
          value={entityType}
          onChange={(v) => filter(() => setEntityType(v))}
          allLabel="All records"
          options={ENTITY_TYPES}
        />
        <Input
          className="w-32"
          inputMode="numeric"
          placeholder="Record id"
          value={entityIdText}
          onChange={(e) => filter(() => setEntityIdText(e.target.value.replace(/\D/g, "")))}
        />
        <FilterSelect value={action} onChange={(v) => filter(() => setAction(v))} allLabel="All actions" options={ACTIONS} />
      </div>

      <DataTable
        columns={columns}
        data={audit.data}
        isLoading={audit.isLoading}
        error={audit.error}
        emptyMessage="No audit entries match."
        pagination={pagination}
      />
    </>
  )
}
