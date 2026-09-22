import * as React from "react"
import Decimal from "decimal.js"

import { AgingCard } from "@/components/aging-card"
import { DatePicker } from "@/components/form-fields"
import { PageHeader } from "@/components/page-header"
import { SectionCards, type SectionCard } from "@/components/section-cards"
import { Button } from "@/components/ui/button"
import { $api } from "@/lib/api/client"
import type { components } from "@/lib/api/schema"
import { formatDate, formatINR, toApiDate } from "@/lib/format"

type AgingSide = components["schemas"]["AgingSide"]

/** Outstanding more than 30 days past the expected payment date (backend buckets 31-45 / 46-60 / 60+). */
function overdue(side: AgingSide) {
  return ["31-45", "46-60", "60+"].reduce((sum, b) => sum.plus(side.buckets[b]?.outstanding ?? 0), new Decimal(0))
}

export function CashflowPage() {
  const today = toApiDate(new Date())
  const [asOf, setAsOf] = React.useState(today)
  const cashflow = $api.useQuery("get", "/reports/cashflow", { params: { query: { as_of: asOf } } })
  const c = cashflow.data

  const net = c && new Decimal(c.receivables.total_outstanding).minus(c.payables.total_outstanding)
  const cards: SectionCard[] | undefined = c && net && [
    {
      label: "Receivables",
      value: formatINR(c.receivables.total_outstanding),
      footerTitle: "Client invoices outstanding",
      footerNote: `${formatINR(overdue(c.receivables).toFixed(2))} more than 30 days overdue`,
    },
    {
      label: "Payables",
      value: formatINR(c.payables.total_outstanding),
      footerTitle: "Vendor costs outstanding",
      footerNote: `${formatINR(overdue(c.payables).toFixed(2))} more than 30 days overdue`,
    },
    {
      label: "Net position",
      value: formatINR(net.toFixed(2)),
      badge: net.isNegative() ? "Negative" : undefined,
      footerTitle: "Receivables − payables",
      footerNote: `As of ${formatDate(c.as_of)}`,
    },
  ]

  return (
    <>
      <PageHeader title="Cash flow" description="Outstanding receivables and payables, aged against a date.">
        {/* Aging is "how late as of this day" — only today or earlier makes sense. */}
        <DatePicker value={asOf} onChange={(v) => setAsOf(v || today)} maxDate={today} className="w-44" />
        {asOf !== today && (
          <Button variant="ghost" onClick={() => setAsOf(today)}>
            Today
          </Button>
        )}
      </PageHeader>
      <SectionCards cards={cards} loadingCount={3} />
      <div className="grid gap-4 px-4 lg:px-6 @5xl/main:grid-cols-2">
        <AgingCard title="Receivables" description="Client invoices outstanding" side={c?.receivables} />
        <AgingCard title="Payables" description="Vendor costs outstanding" side={c?.payables} />
      </div>
    </>
  )
}
