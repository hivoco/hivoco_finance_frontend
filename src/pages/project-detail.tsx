import * as React from "react"
import { PencilIcon } from "lucide-react"
import { Link, useNavigate, useParams } from "react-router"

import { DataTable, type Columns } from "@/components/data-table"
import { DetailCard } from "@/components/detail-list"
import { PageHeader } from "@/components/page-header"
import { QueryState } from "@/components/query-state"
import { Section } from "@/components/section"
import { SectionCards, type SectionCard } from "@/components/section-cards"
import { StatusBadge } from "@/components/status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableFooter, TableRow } from "@/components/ui/table"
import { useCanEdit } from "@/hooks/use-current-user"
import { useClientNames, useUserNames, useVendorNames } from "@/hooks/use-name-maps"
import { $api } from "@/lib/api/client"
import type { components } from "@/lib/api/schema"
import { formatDate, formatINR, humanize } from "@/lib/format"
import { ProjectFormDialog } from "@/pages/projects"

type POLookup = components["schemas"]["POLookup"]
type Cost = components["schemas"]["CostOut"]
type Credit = components["schemas"]["CreditOut"]

export function ProjectDetailPage() {
  const canEdit = useCanEdit()
  const projectId = Number(useParams().id)
  const navigate = useNavigate()
  const clientName = useClientNames()
  const userName = useUserNames()
  const vendorName = useVendorNames()
  const [editing, setEditing] = React.useState(false)
  const path = { params: { path: { project_id: projectId } } }

  const project = $api.useQuery("get", "/projects/{project_id}", path)
  const dashboard = $api.useQuery("get", "/reports/projects/{project_id}/dashboard", path, { enabled: project.isSuccess })
  const pnl = $api.useQuery("get", "/projects/{project_id}/pnl", path, { enabled: project.isSuccess })
  const pos = $api.useQuery("get", "/pos/lookup", { params: { query: { project_id: projectId } } }, { enabled: project.isSuccess })
  const costs = $api.useQuery("get", "/costs", { params: { query: { project_id: projectId, limit: 200 } } }, { enabled: project.isSuccess })
  const credits = $api.useQuery("get", "/credits", { params: { query: { project_id: projectId, limit: 200 } } }, { enabled: project.isSuccess })

  if (!project.data) return <QueryState isLoading={project.isLoading} error={project.error} />
  const p = project.data
  const d = dashboard.data

  const cards: SectionCard[] | undefined = d && [
    { label: "Estimate (approx)", value: formatINR(d.approx_value), footerTitle: "Pipeline value at initiation" },
    { label: "Booked", value: formatINR(d.booked_value), footerTitle: "Allocated from client POs" },
    { label: "Invoiced", value: formatINR(d.invoiced_value), footerTitle: `Revenue ${formatINR(d.revenue)}` },
    {
      label: "Net margin",
      value: formatINR(d.net_margin),
      badge: d.has_provisional_costs ? "Provisional" : undefined,
      footerTitle: d.has_provisional_costs ? "Some vendor invoices not in yet" : "All costs final",
      footerNote: d.overhead_split_pending ? "Overhead not yet apportioned" : undefined,
    },
  ]

  const poColumns: Columns<POLookup> = [
    { header: "PO number", cell: ({ row }) => <span className="font-bold">{row.original.po_number}</span> },
    { header: "PO value", cell: ({ row }) => <span className="tabular-nums">{formatINR(row.original.po_value)}</span> },
    { header: "Status", cell: ({ row }) => <StatusBadge value={row.original.status} /> },
  ]

  const costColumns: Columns<Cost> = [
    { header: "Vendor", cell: ({ row }) => vendorName(row.original.vendor_id) },
    {
      header: "Amount",
      cell: ({ row }) => (
        <span className="tabular-nums">{formatINR(row.original.final_amount ?? row.original.tentative_amount)}</span>
      ),
    },
    {
      header: "Stage",
      cell: ({ row }) => (
        <Badge variant={row.original.is_provisional ? "outline" : "secondary"}>
          {row.original.is_provisional ? "Tentative" : "Final"}
        </Badge>
      ),
    },
    { header: "Payment", cell: ({ row }) => <StatusBadge value={row.original.payment_status} /> },
  ]

  const creditColumns: Columns<Credit> = [
    { header: "Date", cell: ({ row }) => formatDate(row.original.credit_date) },
    { header: "Amount", cell: ({ row }) => <span className="tabular-nums">{formatINR(row.original.amount)}</span> },
    { header: "Description", cell: ({ row }) => row.original.description ?? "—" },
  ]

  return (
    <>
      <PageHeader
        title={p.project_name}
        description={
          <span className="inline-flex items-center gap-2">
            {clientName(p.client_id)} <StatusBadge value={p.status} />
          </span>
        }
      >
        {canEdit && (
          <Button variant="outline" onClick={() => setEditing(true)}>
            <PencilIcon />
            Edit
          </Button>
        )}
      </PageHeader>

      <SectionCards cards={cards} />

      <div className="grid gap-4 px-4 lg:px-6 @5xl/main:grid-cols-2">
        <DetailCard
          title="Details"
          items={[
            { label: "Project code", value: p.project_code ?? "—" },
            { label: "Client", value: clientName(p.client_id) },
            { label: "Initiation date", value: formatDate(p.initiation_date) },
            { label: "Owning BU", value: p.owning_bu ?? "—" },
            { label: "Owner", value: userName(p.assigned_user_id) },
            { label: "Status", value: humanize(p.status) },
          ]}
        />

        <Card>
          <CardHeader>
            <CardTitle>Profit & loss</CardTitle>
            <CardDescription>
              {pnl.data?.has_provisional_costs ? "Provisional — vendor invoices pending" : "Revenue − costs − credits − overhead"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pnl.data && (
              <Table>
                <TableBody>
                  <PnlRow label="Revenue" value={pnl.data.revenue} />
                  <PnlRow label="External costs — final" value={pnl.data.external_costs_final} minus />
                  <PnlRow label="External costs — provisional" value={pnl.data.external_costs_provisional} minus />
                  <PnlRow label="Project credits" value={pnl.data.project_credits} minus />
                  <PnlRow
                    label={pnl.data.overhead_split_pending ? "Overhead (not yet apportioned)" : "Overhead apportioned"}
                    value={pnl.data.overhead_apportioned}
                    minus
                  />
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell>Net margin</TableCell>
                    <TableCell className="text-right tabular-nums">{formatINR(pnl.data.net_margin)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Section title="Purchase orders">
        <DataTable
          columns={poColumns}
          data={pos.data}
          isLoading={pos.isLoading}
          error={pos.error}
          emptyMessage="No POs allocated to this project."
          onRowClick={(po) => navigate(`/pos/${po.id}`)}
        />
      </Section>

      <Section title="External costs">
        <DataTable
          columns={costColumns}
          data={costs.data}
          isLoading={costs.isLoading}
          error={costs.error}
          emptyMessage="No vendor costs on this project."
          onRowClick={(c) => navigate(`/costs/${c.id}`)}
        />
      </Section>

      <Section title="Credits">
        <DataTable columns={creditColumns} data={credits.data} isLoading={credits.isLoading} error={credits.error} emptyMessage="No credits." />
      </Section>

      <p className="px-4 text-sm text-muted-foreground lg:px-6">
        <Link to="/projects" className="underline underline-offset-4">
          ← All projects
        </Link>
      </p>

      {editing && <ProjectFormDialog project={p} onClose={() => setEditing(false)} />}
    </>
  )
}

function PnlRow({ label, value, minus }: { label: string; value: string; minus?: boolean }) {
  return (
    <TableRow>
      <TableCell className="text-muted-foreground">{label}</TableCell>
      <TableCell className="text-right tabular-nums">
        {minus && "− "}
        {formatINR(value)}
      </TableCell>
    </TableRow>
  )
}

