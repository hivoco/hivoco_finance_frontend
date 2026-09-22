import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { components } from "@/lib/api/schema"
import { formatINR } from "@/lib/format"

type AgingSide = components["schemas"]["AgingSide"]

const BUCKETS = ["0-30", "31-45", "46-60", "60+"] as const

/** Receivables / payables aged into 0-30 / 31-45 / 46-60 / 60+ day buckets. */
export function AgingCard({
  title,
  description,
  side,
}: {
  title: string
  description: string
  side?: AgingSide
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}, aged by days</CardDescription>
      </CardHeader>
      <CardContent>
        {side ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Age (days)</TableHead>
                <TableHead className="text-right">Count</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {BUCKETS.map((bucket) => (
                <TableRow key={bucket}>
                  <TableCell>{bucket}</TableCell>
                  <TableCell className="text-right tabular-nums">{side.buckets[bucket]?.count ?? 0}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatINR(side.buckets[bucket]?.outstanding ?? "0")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={2}>Total</TableCell>
                <TableCell className="text-right tabular-nums">{formatINR(side.total_outstanding)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        ) : (
          <Skeleton className="h-48" />
        )}
      </CardContent>
    </Card>
  )
}
