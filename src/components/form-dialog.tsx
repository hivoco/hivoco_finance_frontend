import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FieldGroup } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { PortalContainerContext } from "@/lib/portal-container"

/** Dialog wrapping a react-hook-form <form>. Pass `onSubmit={form.handleSubmit(...)}`. */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel = "Save",
  isPending,
  onSubmit,
  children,
  wide,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: React.ReactNode
  submitLabel?: string
  isPending?: boolean
  onSubmit: React.FormEventHandler<HTMLFormElement>
  children: React.ReactNode
  wide?: boolean
}) {
  // Dropdown lists inside the form render into this element (see portal-container.ts).
  const [contentEl, setContentEl] = React.useState<HTMLDivElement | null>(null)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent ref={setContentEl} className={wide ? "sm:max-w-2xl" : "sm:max-w-lg"}>
        <form onSubmit={onSubmit} className="flex max-h-[80svh] flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <div className="-mx-4 overflow-y-auto px-4 py-1">
            <PortalContainerContext value={contentEl}>
              <FieldGroup>{children}</FieldGroup>
            </PortalContainerContext>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending && <Spinner />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
