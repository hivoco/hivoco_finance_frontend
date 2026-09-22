import { SectionCards, type SectionCard } from "@/components/section-cards"
import { AgingCard } from "@/components/aging-card"
import { $api } from "@/lib/api/client"
import { countLabel } from "@/lib/format"
import { formatINR } from "@/lib/money"

export function DashboardPage() {
  const dashboard = $api.useQuery("get", "/reports/company-dashboard")
  const cashflow = $api.useQuery("get", "/reports/cashflow")
  const d = dashboard.data

  const cards: SectionCard[] | undefined = d && [
    {
      label: "Pipeline",
      value: formatINR(d.pipeline_value),
      badge: countLabel(d.pipeline_count, "project"),
      footerTitle: "Approx value of initiated projects",
      footerNote: "Recognized in initiation month",
    },
    {
      label: "Booked",
      value: formatINR(d.booked_value),
      badge: countLabel(d.po_count, "PO"),
      footerTitle: "Client purchase orders received",
      footerNote: "Recognized in PO-date month",
    },
    {
      label: "Revenue",
      value: formatINR(d.revenue_value),
      badge: countLabel(d.invoice_count, "invoice"),
      footerTitle: "Invoiced to clients",
      footerNote: "Recognized in invoice-date month",
    },
    {
      label: "Margin (pre-overhead)",
      value: formatINR(d.consolidated_margin_pre_overhead),
      footerTitle: `Costs ${formatINR(d.external_costs_total)} · Credits ${formatINR(d.project_credits_total)}`,
      footerNote: `Overhead recorded ${formatINR(d.overhead_recorded_total)}, not yet apportioned`,
    },
  ]

  return (
    <>
      <SectionCards cards={cards} />
      <div className="grid gap-4 px-4 lg:px-6 @5xl/main:grid-cols-2">
        <AgingCard title="Receivables" description="Client invoices outstanding" side={cashflow.data?.receivables} />
        <AgingCard title="Payables" description="Vendor costs outstanding" side={cashflow.data?.payables} />
      </div>
    </>
  )
}
