import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { PlusIcon } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"
import { Link } from "react-router"
import { z } from "zod"

import { DataTable, useOffsetPagination, type Columns } from "@/components/data-table"
import { ALL, FilterSelect, filterValue } from "@/components/filter-select"
import { FormDialog } from "@/components/form-dialog"
import { DateField, LookupCombobox, LookupField, MoneyField, SelectField, TextareaField } from "@/components/form-fields"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useCanEdit } from "@/hooks/use-current-user"
import { projectLookup } from "@/hooks/use-lookups"
import { useProjectNames } from "@/hooks/use-name-maps"
import { $api } from "@/lib/api/client"
import type { components } from "@/lib/api/schema"
import { CREDIT_TYPES, options, type CreditType } from "@/lib/enums"
import { formatDate, formatINR, humanize } from "@/lib/format"
import { dateRequired, idOptional, moneyRequired, textOptional } from "@/lib/schemas"

type Credit = components["schemas"]["CreditOut"]

const useAllProjects = projectLookup()

export function CreditsPage() {
  const canEdit = useCanEdit()
  const projectName = useProjectNames()
  const [creditType, setCreditType] = React.useState<string>(ALL)
  const [projectId, setProjectId] = React.useState<number | null>(null)
  const [creating, setCreating] = React.useState(false)
  const pagination = useOffsetPagination()

  const credits = $api.useQuery("get", "/credits", {
    params: {
      query: {
        credit_type: filterValue<CreditType>(creditType),
        project_id: projectId ?? undefined,
        limit: pagination.limit,
        offset: pagination.offset,
      },
    },
  })

  const columns: Columns<Credit> = [
    { header: "Date", cell: ({ row }) => formatDate(row.original.credit_date) },
    {
      header: "Type",
      cell: ({ row }) => (
        <Badge variant={row.original.credit_type === "generic" ? "outline" : "secondary"}>
          {humanize(row.original.credit_type)}
        </Badge>
      ),
    },
    {
      header: "Project",
      cell: ({ row }) =>
        row.original.project_id ? (
          <Link to={`/projects/${row.original.project_id}`} className="underline-offset-4 hover:underline">
            {projectName(row.original.project_id)}
          </Link>
        ) : (
          <span className="text-muted-foreground">Company-wide</span>
        ),
    },
    {
      id: "amount",
      header: () => <div className="text-right">Amount</div>,
      cell: ({ row }) => <div className="text-right tabular-nums">{formatINR(row.original.amount)}</div>,
    },
    { header: "Description", cell: ({ row }) => row.original.description ?? "—" },
  ]

  return (
    <>
      <PageHeader
        title="Credits"
        description="Project-specific credits reduce that project's margin; generic credits go to the overhead pool."
      >
        {canEdit && (
          <Button onClick={() => setCreating(true)}>
            <PlusIcon />
            New credit
          </Button>
        )}
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3 px-4 lg:px-6">
        <FilterSelect
          value={creditType}
          onChange={(v) => {
            setCreditType(v)
            pagination.reset()
          }}
          allLabel="All types"
          options={options(CREDIT_TYPES)}
        />
        <LookupCombobox
          value={projectId}
          onChange={(item) => {
            setProjectId(item?.id ?? null)
            pagination.reset()
          }}
          useItems={useAllProjects}
          placeholder="All projects"
          className="w-56"
        />
      </div>

      <DataTable
        columns={columns}
        data={credits.data}
        isLoading={credits.isLoading}
        error={credits.error}
        emptyMessage="No credits found."
        pagination={pagination}
      />

      {creating && <CreditFormDialog onClose={() => setCreating(false)} />}
    </>
  )
}

const creditSchema = z
  .object({
    credit_type: z.enum(["project_specific", "generic"]),
    project_id: idOptional,
    amount: moneyRequired,
    credit_date: dateRequired,
    description: textOptional,
  })
  .refine((v) => v.credit_type === "generic" || v.project_id, {
    path: ["project_id"],
    message: "Project-specific credits need a project",
  })

function CreditFormDialog({ onClose }: { onClose: () => void }) {
  const form = useForm<z.input<typeof creditSchema>, unknown, z.output<typeof creditSchema>>({
    resolver: zodResolver(creditSchema),
    defaultValues: { credit_type: "project_specific", project_id: null, amount: "", credit_date: "", description: "" },
  })
  const creditType = useWatch({ control: form.control, name: "credit_type" })
  const create = $api.useMutation("post", "/credits", { onSuccess: onClose })

  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title="New credit"
      submitLabel="Create credit"
      isPending={create.isPending}
      onSubmit={form.handleSubmit((v) =>
        create.mutate({
          body: { ...v, project_id: v.credit_type === "generic" ? null : v.project_id },
        })
      )}
    >
      <SelectField control={form.control} name="credit_type" label="Type" options={options(CREDIT_TYPES)} />
      {creditType === "project_specific" && (
        <LookupField
          control={form.control}
          name="project_id"
          label="Project"
          useItems={useAllProjects}
          placeholder="Search project…"
        />
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <MoneyField control={form.control} name="amount" label="Amount" />
        <DateField control={form.control} name="credit_date" label="Credit date" />
      </div>
      <TextareaField control={form.control} name="description" label="Description" />
    </FormDialog>
  )
}
