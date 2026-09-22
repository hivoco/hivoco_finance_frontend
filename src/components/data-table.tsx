import * as React from "react"
import {
  FlexRender,
  tableFeatures,
  useTable,
  type ColumnDef,
  type RowData,
} from "@tanstack/react-table"
import { ChevronLeftIcon, ChevronRightIcon, CircleAlertIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getErrorMessage } from "@/lib/api/errors"

// Generic table on TanStack Table v9 + shadcn Table (pattern from the shadcn
// data-table guide / dashboard-01 block). Pagination and filtering happen on
// the server (limit/offset), so only core features are registered.
export const tableFeaturesCore = tableFeatures({})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Columns<TData extends RowData> = ColumnDef<typeof tableFeaturesCore, TData, any>[]

export function DataTable<TData extends RowData>({
  columns,
  data,
  isLoading,
  error,
  emptyMessage = "Nothing here yet.",
  onRowClick,
  pagination,
}: {
  columns: Columns<TData>
  data?: TData[]
  isLoading?: boolean
  /** Query error — shown instead of the empty message so a failure never looks like "no data". */
  error?: unknown
  emptyMessage?: React.ReactNode
  onRowClick?: (row: TData) => void
  pagination?: OffsetPagination
}) {
  const rows = React.useMemo(() => data ?? [], [data])
  const table = useTable({ features: tableFeaturesCore, data: rows, columns })

  return (
    <div className="flex flex-col gap-3 px-4 lg:px-6">
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-muted">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} colSpan={header.colSpan}>
                    {header.isPlaceholder ? null : <FlexRender header={header} />}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }, (_, i) => (
                <TableRow key={i}>
                  {columns.map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : error && rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-destructive">
                  <span className="inline-flex items-center gap-2">
                    <CircleAlertIcon className="size-4" />
                    Couldn&apos;t load: {getErrorMessage(error)}
                  </span>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={onRowClick ? "cursor-pointer" : undefined}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                >
                  {row.getAllCells().map((cell) => (
                    <TableCell key={cell.id}>
                      <FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {pagination && (pagination.page > 1 || rows.length >= pagination.limit) && (
        <div className="flex items-center justify-end gap-2">
          <span className="text-sm text-muted-foreground">Page {pagination.page}</span>
          <Button variant="outline" size="icon-sm" onClick={pagination.prev} disabled={pagination.page === 1}>
            <ChevronLeftIcon />
            <span className="sr-only">Previous page</span>
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={pagination.next}
            disabled={rows.length < pagination.limit}
          >
            <ChevronRightIcon />
            <span className="sr-only">Next page</span>
          </Button>
        </div>
      )}
    </div>
  )
}

export type OffsetPagination = ReturnType<typeof useOffsetPagination>

/** limit/offset paging. The API has no total count, so "next" is enabled while a page is full. */
export function useOffsetPagination(limit = 50) {
  const [page, setPage] = React.useState(1)
  return {
    limit,
    page,
    offset: (page - 1) * limit,
    next: () => setPage((p) => p + 1),
    prev: () => setPage((p) => Math.max(1, p - 1)),
    reset: () => setPage(1),
  }
}
