import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card"

export type DetailItem = { label: string; value: React.ReactNode }

/** Label/value grid inside a Card — for detail pages. */
export function DetailCard({
  title,
  items,
  action,
}: {
  title: string
  items: DetailItem[]
  action?: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent>
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <div key={item.label} className="min-w-0">
              <dt className="text-xs text-muted-foreground">{item.label}</dt>
              <dd className="truncate text-sm font-normal">{item.value ?? "—"}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}
