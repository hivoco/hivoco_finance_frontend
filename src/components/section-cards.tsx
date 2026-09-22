import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export type SectionCard = {
  label: string
  value: string
  badge?: React.ReactNode
  footerTitle: React.ReactNode
  footerNote?: React.ReactNode
}

const GRID =
  "grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card"

// From the shadcn dashboard-01 block, made data-driven. Pass `cards` undefined
// while loading to render skeletons.
export function SectionCards({ cards, loadingCount = 4 }: { cards?: SectionCard[]; loadingCount?: number }) {
  if (!cards) {
    return (
      <div className={GRID}>
        {Array.from({ length: loadingCount }, (_, i) => (
          <Skeleton key={i} className="h-36 rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className={GRID}>
      {cards.map((card) => (
        <Card key={card.label} className="@container/card">
          <CardHeader>
            {/* Badge sits beside the small label, not the big number, so it can't
                push the card wider on narrow (4-column) layouts. */}
            <div className="flex min-w-0 items-center justify-between gap-2">
              <CardDescription className="truncate">{card.label}</CardDescription>
              {card.badge && <Badge variant="outline">{card.badge}</Badge>}
            </div>
            <CardTitle
              className="min-w-0 truncate text-2xl font-bold tabular-nums @[340px]/card:text-3xl"
              title={card.value}
            >
              {card.value}
            </CardTitle>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-normal">{card.footerTitle}</div>
            {card.footerNote && <div className="text-muted-foreground">{card.footerNote}</div>}
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
