import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { LockIcon, LockOpenIcon } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"
import { z } from "zod"

import { DataTable, type Columns } from "@/components/data-table"
import { FormDialog } from "@/components/form-dialog"
import { LookupCombobox, LookupField, SelectField, TextareaField } from "@/components/form-fields"
import { PageHeader } from "@/components/page-header"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useIsSuperAdmin } from "@/hooks/use-current-user"
import { projectLookup } from "@/hooks/use-lookups"
import { useProjectNames, useUserNames } from "@/hooks/use-name-maps"
import { useSettingsMap } from "@/hooks/use-settings"
import { $api } from "@/lib/api/client"
import type { components } from "@/lib/api/schema"
import { MONTHS } from "@/lib/enums"
import { formatDateTime, humanize } from "@/lib/format"
import { idOptional, textRequired } from "@/lib/schemas"

type Lock = components["schemas"]["LockOut"]

const useAllProjects = projectLookup()

function periodLabel(year: number, month: number) {
  return `${MONTHS[month - 1]?.label ?? month} ${year}`
}

export function LocksPage() {
  const isSuperAdmin = useIsSuperAdmin()
  const projectName = useProjectNames()
  const userName = useUserNames()
  const granularity = useSettingsMap().get("lock_granularity")
  const thisYear = new Date().getFullYear()
  const [year, setYear] = React.useState(String(thisYear))
  const [projectId, setProjectId] = React.useState<number | null>(null)
  const [locking, setLocking] = React.useState(false)
  const [unlocking, setUnlocking] = React.useState<Lock | null>(null)

  const locks = $api.useQuery("get", "/locks", {
    params: { query: { year: Number(year), project_id: projectId ?? undefined } },
  })

  const columns: Columns<Lock> = [
    { header: "Period", cell: ({ row }) => <span className="font-bold">{periodLabel(row.original.period_year, row.original.period_month)}</span> },
    {
      header: "Scope",
      cell: ({ row }) =>
        row.original.project_id ? projectName(row.original.project_id) : <Badge variant="secondary">Company-wide</Badge>,
    },
    {
      header: "State",
      cell: ({ row }) =>
        row.original.is_locked ? (
          <Badge>
            <LockIcon />
            Locked
          </Badge>
        ) : (
          <Badge variant="outline">
            <LockOpenIcon />
            Unlocked
          </Badge>
        ),
    },
    { header: "By", cell: ({ row }) => userName(row.original.locked_by) },
    { header: "At", cell: ({ row }) => formatDateTime(row.original.locked_at) },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) =>
        isSuperAdmin &&
        row.original.is_locked && (
          <Button size="sm" variant="outline" onClick={() => setUnlocking(row.original)}>
            <LockOpenIcon />
            Unlock
          </Button>
        ),
    },
  ]

  return (
    <>
      <PageHeader title="Month locks" description="A locked month rejects backdated entries (HTTP 423).">
        {isSuperAdmin && (
          <Button onClick={() => setLocking(true)}>
            <LockIcon />
            Lock a month
          </Button>
        )}
      </PageHeader>

      {granularity && (
        <div className="px-4 lg:px-6">
          <Alert>
            <AlertDescription>
              Lock granularity setting: <span className="font-bold text-foreground">{humanize(granularity)}</span>
            </AlertDescription>
          </Alert>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 px-4 lg:px-6">
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 6 }, (_, i) => String(thisYear - 4 + i)).map((y) => (
              <SelectItem key={y} value={y}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <LookupCombobox
          value={projectId}
          onChange={(item) => setProjectId(item?.id ?? null)}
          useItems={useAllProjects}
          placeholder="All scopes"
          className="w-56"
        />
      </div>

      <DataTable columns={columns} data={locks.data} isLoading={locks.isLoading} error={locks.error} emptyMessage="No locks for this year." />

      {locking && <LockDialog defaultYear={Number(year)} onClose={() => setLocking(false)} />}
      {unlocking && <UnlockDialog lock={unlocking} onClose={() => setUnlocking(null)} />}
    </>
  )
}

const lockSchema = z
  .object({
    scope: z.enum(["company", "project"]),
    project_id: idOptional,
    period_year: z.string(),
    period_month: z.string(),
  })
  .refine((v) => v.scope === "company" || v.project_id, { path: ["project_id"], message: "Pick a project" })

function LockDialog({ defaultYear, onClose }: { defaultYear: number; onClose: () => void }) {
  const granularity = useSettingsMap().get("lock_granularity")
  const form = useForm<z.input<typeof lockSchema>, unknown, z.output<typeof lockSchema>>({
    resolver: zodResolver(lockSchema),
    defaultValues: {
      scope: granularity === "company_wide" ? "company" : "project",
      project_id: null,
      period_year: String(defaultYear),
      period_month: String(new Date().getMonth() + 1),
    },
  })
  const scope = useWatch({ control: form.control, name: "scope" })
  const lock = $api.useMutation("post", "/locks", { onSuccess: onClose })
  const thisYear = new Date().getFullYear()

  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title="Lock a month"
      description="Backdated POs, invoices and costs dated in this month will be rejected."
      submitLabel="Lock"
      isPending={lock.isPending}
      onSubmit={form.handleSubmit((v) =>
        lock.mutate({
          body: {
            project_id: v.scope === "company" ? null : v.project_id,
            period_year: Number(v.period_year),
            period_month: Number(v.period_month),
          },
        })
      )}
    >
      <SelectField
        control={form.control}
        name="scope"
        label="Scope"
        options={[
          { value: "project", label: "One project" },
          { value: "company", label: "Company-wide" },
        ]}
      />
      {scope === "project" && (
        <LookupField control={form.control} name="project_id" label="Project" useItems={useAllProjects} />
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField control={form.control} name="period_month" label="Month" options={MONTHS} />
        <SelectField
          control={form.control}
          name="period_year"
          label="Year"
          options={Array.from({ length: 6 }, (_, i) => String(thisYear - 4 + i)).map((y) => ({ value: y, label: y }))}
        />
      </div>
    </FormDialog>
  )
}

const unlockSchema = z.object({ reason: textRequired.max(255) })

function UnlockDialog({ lock, onClose }: { lock: Lock; onClose: () => void }) {
  const projectName = useProjectNames()
  const form = useForm<z.input<typeof unlockSchema>>({
    resolver: zodResolver(unlockSchema),
    defaultValues: { reason: "" },
  })
  const unlock = $api.useMutation("post", "/locks/unlock", { onSuccess: onClose })

  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={`Unlock ${periodLabel(lock.period_year, lock.period_month)}`}
      description={`${lock.project_id ? projectName(lock.project_id) : "Company-wide"} · the reason is written to the audit log.`}
      submitLabel="Unlock"
      isPending={unlock.isPending}
      onSubmit={form.handleSubmit(({ reason }) =>
        unlock.mutate({
          body: {
            project_id: lock.project_id,
            period_year: lock.period_year,
            period_month: lock.period_month,
            reason,
          },
        })
      )}
    >
      <TextareaField control={form.control} name="reason" label="Reason" />
    </FormDialog>
  )
}
