import { DataTable, type Columns } from "@/components/data-table"
import { PageHeader } from "@/components/page-header"
import { $api } from "@/lib/api/client"
import type { components } from "@/lib/api/schema"
import { formatINR, sumMoney } from "@/lib/money"

type LedgerRow = components["schemas"]["VendorLedgerRow"]

export function VendorLedgerPage() {
  const ledger = $api.useQuery("get", "/reports/vendor-ledger")
  const total = ledger.data ? sumMoney(ledger.data.map((r) => r.outstanding)).toFixed(2) : undefined

  const columns: Columns<LedgerRow> = [
    { header: "Vendor", cell: ({ row }) => <span className="font-bold">{row.original.vendor_name}</span> },
    { id: "open", header: () => <div className="text-right">Open costs</div>, cell: ({ row }) => <div className="text-right tabular-nums">{row.original.open_costs}</div> },
    {
      id: "outstanding",
      header: () => <div className="text-right">Outstanding</div>,
      cell: ({ row }) => <div className="text-right tabular-nums">{formatINR(row.original.outstanding)}</div>,
    },
  ]

  return (
    <>
      <PageHeader
        title="Vendor ledger"
        description={total ? `Outstanding payable per vendor · total ${formatINR(total)}` : "Outstanding payable per vendor"}
      />
      <DataTable
        columns={columns}
        data={ledger.data}
        isLoading={ledger.isLoading}
        error={ledger.error}
        emptyMessage="Nothing outstanding to vendors."
      />
    </>
  )
}
