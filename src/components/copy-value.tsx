import * as React from "react"
import { CheckIcon, CopyIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** Value with a copy-to-clipboard button. Stops click propagation so it works inside clickable rows. */
export function CopyValue({
  value,
  label = "Value",
  className,
}: {
  value: string | number
  label?: string
  className?: string
}) {
  const [copied, setCopied] = React.useState(false)

  React.useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(t)
  }, [copied])

  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(String(value))
      setCopied(true)
      toast.success(`${label} copied`)
    } catch {
      toast.error("Couldn't copy to clipboard")
    }
  }

  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span className="tabular-nums">{value}</span>
      <Button type="button" variant="ghost" size="icon-xs" onClick={copy} aria-label={`Copy ${label}`}>
        {copied ? <CheckIcon /> : <CopyIcon />}
      </Button>
    </span>
  )
}
