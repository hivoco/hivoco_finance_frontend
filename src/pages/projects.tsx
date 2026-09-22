import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { PlusIcon, SearchIcon } from "lucide-react"
import { useForm } from "react-hook-form"
import { useNavigate } from "react-router"
import { useDebounce } from "use-debounce"
import { z } from "zod"

import { DataTable, useOffsetPagination, type Columns } from "@/components/data-table"
import { FormDialog } from "@/components/form-dialog"
import {
  DateField,
  LookupCombobox,
  LookupField,
  MoneyField,
  SelectField,
  TextField,
} from "@/components/form-fields"
import { ALL, FilterSelect, filterValue } from "@/components/filter-select"
import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { useCanEdit, useIsSuperAdmin } from "@/hooks/use-current-user"
import { useClientLookup } from "@/hooks/use-lookups"
import { useClientNames, useUserNames } from "@/hooks/use-name-maps"
import { $api } from "@/lib/api/client"
import { BUSINESS_UNITS, options, PROJECT_STATUSES, type ProjectStatus, type BusinessUnit } from "@/lib/enums"
import type { components } from "@/lib/api/schema"
import { formatDate, formatINR } from "@/lib/format"
import { dateRequired, idRequired, moneyOptional, textRequired } from "@/lib/schemas"

type Project = components["schemas"]["ProjectOut"]

export function ProjectsPage() {
  const navigate = useNavigate()
  const clientName = useClientNames()
  const userName = useUserNames()
  const isSuperAdmin = useIsSuperAdmin()
  const canEdit = useCanEdit()
  const [search, setSearch] = React.useState("")
  const [q] = useDebounce(search, 300)
  const [clientId, setClientId] = React.useState<number | null>(null)
  const [status, setStatus] = React.useState<string>(ALL)
  const [creating, setCreating] = React.useState(false)
  const pagination = useOffsetPagination()

  const projects = $api.useQuery("get", "/projects", {
    params: {
      query: {
        q: q || undefined,
        client_id: clientId ?? undefined,
        status: filterValue<ProjectStatus>(status),
        limit: pagination.limit,
        offset: pagination.offset,
      },
    },
  })

  const columns: Columns<Project> = [
    {
      header: "Project",
      cell: ({ row }) => (
        <div className="min-w-0">
          <div className="font-bold">{row.original.project_name}</div>
          {row.original.project_code && (
            <div className="text-xs text-muted-foreground">{row.original.project_code}</div>
          )}
        </div>
      ),
    },
    { header: "Client", cell: ({ row }) => clientName(row.original.client_id) },
    {
      header: () => <div className="text-right">Approx value</div>,
      id: "approx",
      cell: ({ row }) => <div className="text-right tabular-nums">{formatINR(row.original.approx_value)}</div>,
    },
    { header: "Initiated", cell: ({ row }) => formatDate(row.original.initiation_date) },
    { header: "Status", cell: ({ row }) => <StatusBadge value={row.original.status} /> },
    { header: "BU", cell: ({ row }) => row.original.owning_bu ?? "—" },
    ...(isSuperAdmin
      ? ([{ header: "Owner", cell: ({ row }) => userName(row.original.assigned_user_id) }] satisfies Columns<Project>)
      : []),
  ]

  return (
    <>
      <PageHeader title="Projects" description="The anchor — every PO, invoice, cost and credit hangs off a project.">
        {canEdit && (
          <Button onClick={() => setCreating(true)}>
            <PlusIcon />
            New project
          </Button>
        )}
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3 px-4 lg:px-6">
        <InputGroup className="max-w-xs">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Search project…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              pagination.reset()
            }}
          />
        </InputGroup>
        <LookupCombobox
          value={clientId}
          onChange={(item) => {
            setClientId(item?.id ?? null)
            pagination.reset()
          }}
          useItems={useClientLookup}
          placeholder="All clients"
          className="w-56"
        />
        <FilterSelect
          value={status}
          onChange={(v) => {
            setStatus(v)
            pagination.reset()
          }}
          allLabel="All statuses"
          options={options(PROJECT_STATUSES)}
        />
      </div>

      <DataTable
        columns={columns}
        data={projects.data}
        isLoading={projects.isLoading}
        error={projects.error}
        emptyMessage="No projects found."
        onRowClick={(p) => navigate(`/projects/${p.id}`)}
        pagination={pagination}
      />

      {creating && (
        <ProjectFormDialog
          onClose={() => setCreating(false)}
          onSaved={(p) => navigate(`/projects/${p.id}`)}
        />
      )}
    </>
  )
}

const projectSchema = z.object({
  project_name: textRequired.max(190),
  client_id: idRequired,
  approx_value: moneyOptional,
  initiation_date: dateRequired,
  // Blank = leave as is (Select can't clear; a legacy free-text BU isn't re-sent).
  owning_bu: z.string().transform((v) => (v ? (v as BusinessUnit) : undefined)),
  // Select holds a string id; "" = unassigned
  assigned_user_id: z.string().transform((v) => (v ? Number(v) : null)),
  status: z.enum(PROJECT_STATUSES.map((s) => s.value) as [ProjectStatus, ...ProjectStatus[]]),
})

type ProjectFormInput = z.input<typeof projectSchema>

/** Create (project) or edit (existing). project_user: owner is forced server-side. */
export function ProjectFormDialog({
  project,
  onClose,
  onSaved,
}: {
  project?: Project
  onClose: () => void
  onSaved?: (project: Project) => void
}) {
  const isEdit = !!project
  const isSuperAdmin = useIsSuperAdmin()
  const users = $api.useQuery("get", "/users", { params: { query: { limit: 500 } } }, { enabled: isSuperAdmin })

  const form = useForm<ProjectFormInput, unknown, z.output<typeof projectSchema>>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      project_name: project?.project_name ?? "",
      client_id: project?.client_id ?? (null as unknown as number),
      approx_value: project?.approx_value ?? "",
      initiation_date: project?.initiation_date ?? "",
      owning_bu: BUSINESS_UNITS.some((b) => b.value === project?.owning_bu) ? project!.owning_bu! : "",
      assigned_user_id: project?.assigned_user_id ? String(project.assigned_user_id) : "",
      status: (project?.status as ProjectStatus) ?? "pipeline",
    },
  })

  const done = (p: Project) => {
    onClose()
    onSaved?.(p)
  }
  const create = $api.useMutation("post", "/projects", { onSuccess: done })
  const update = $api.useMutation("put", "/projects/{project_id}", { onSuccess: done })

  const ownerOptions = (users.data ?? [])
    .filter((u) => u.is_active && u.role !== "admin")
    .map((u) => ({ value: String(u.id), label: `${u.name} (${u.role === "super_admin" ? "Super admin" : "PM"})` }))

  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={isEdit ? "Edit project" : "New project"}
      description={isEdit ? undefined : "Starts in the Pipeline stage (recognized in the initiation month)."}
      submitLabel={isEdit ? "Save changes" : "Create project"}
      isPending={create.isPending || update.isPending}
      onSubmit={form.handleSubmit(({ client_id, status, ...body }) => {
        if (isEdit) {
          update.mutate({ params: { path: { project_id: project.id } }, body: { ...body, status } })
        } else {
          create.mutate({ body: { ...body, client_id } })
        }
      })}
    >
      <TextField control={form.control} name="project_name" label="Project name" />
      <LookupField
        control={form.control}
        name="client_id"
        label="Client"
        useItems={useClientLookup}
        placeholder="Search client…"
        disabled={isEdit}
        description={isEdit ? "A project's client can't be changed." : undefined}
      />
      <SelectField
        control={form.control}
        name="owning_bu"
        label="Owning BU"
        options={options(BUSINESS_UNITS)}
        placeholder="Select BU"
        description={
          isEdit
            ? `Project code ${project.project_code ?? "—"} (auto-generated)`
            : "The project code is generated automatically."
        }
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <MoneyField control={form.control} name="approx_value" label="Approx value" />
        <DateField control={form.control} name="initiation_date" label="Initiation date" />
      </div>
      {isSuperAdmin ? (
        <SelectField
          control={form.control}
          name="assigned_user_id"
          label="Project owner"
          options={ownerOptions}
          placeholder="Unassigned"
        />
      ) : (
        !isEdit && (
          <p className="text-sm text-muted-foreground">You&apos;ll be set as the owner of this project.</p>
        )
      )}
      {isEdit && (
        <SelectField control={form.control} name="status" label="Status" options={options(PROJECT_STATUSES)} />
      )}
    </FormDialog>
  )
}
