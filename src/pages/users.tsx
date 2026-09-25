import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { PencilIcon, PlusIcon } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { DataTable, type Columns } from "@/components/data-table"
import { FormDialog } from "@/components/form-dialog"
import { PasswordField, SelectField, SwitchField, TextField } from "@/components/form-fields"
import { PageHeader } from "@/components/page-header"
import { BoolBadge } from "@/components/status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useCurrentUser } from "@/hooks/use-current-user"
import { $api } from "@/lib/api/client"
import type { components } from "@/lib/api/schema"
import { options, ROLE_LABEL, ROLES, type RoleValue } from "@/lib/enums"
import { humanize } from "@/lib/format"
import { textRequired } from "@/lib/schemas"

type User = components["schemas"]["UserOut"]

const ROLE_VALUES = ROLES.map((r) => r.value) as [RoleValue, ...RoleValue[]]

export function UsersPage() {
  const { data: me } = useCurrentUser()
  const [editing, setEditing] = React.useState<User | "new" | null>(null)
  const users = $api.useQuery("get", "/users", { params: { query: { limit: 500 } } })

  const columns: Columns<User> = [
    {
      header: "Name",
      cell: ({ row }) => (
        <span className="font-bold">
          {row.original.name}
          {row.original.id === me?.id && <span className="text-muted-foreground"> (you)</span>}
        </span>
      ),
    },
    { header: "Email", cell: ({ row }) => row.original.email },
    {
      header: "Role",
      cell: ({ row }) => (
        <Badge variant={row.original.role === "super_admin" ? "default" : row.original.role === "admin" ? "outline" : "secondary"}>
          {ROLE_LABEL[row.original.role] ?? humanize(row.original.role)}
        </Badge>
      ),
    },
    { header: "Status", cell: ({ row }) => <BoolBadge value={row.original.is_active} yes="Active" no="Deactivated" /> },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <Button variant="ghost" size="icon-sm" onClick={() => setEditing(row.original)}>
          <PencilIcon />
          <span className="sr-only">Edit</span>
        </Button>
      ),
    },
  ]

  return (
    <>
      <PageHeader title="Users" description="No public signup — create accounts here with a temporary password.">
        <Button onClick={() => setEditing("new")}>
          <PlusIcon />
          New user
        </Button>
      </PageHeader>

      <DataTable columns={columns} data={users.data} isLoading={users.isLoading} error={users.error} emptyMessage="No users." />

      {editing === "new" && <CreateUserDialog onClose={() => setEditing(null)} />}
      {editing && editing !== "new" && (
        <EditUserDialog userId={editing.id} isSelf={editing.id === me?.id} onClose={() => setEditing(null)} />
      )}
    </>
  )
}

const createSchema = z.object({
  name: textRequired.max(120),
  email: z.email("Enter a valid email"),
  role: z.enum(ROLE_VALUES),
  password: z.string().min(6, "At least 6 characters").max(128),
})

function CreateUserDialog({ onClose }: { onClose: () => void }) {
  const form = useForm<z.input<typeof createSchema>>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: "", email: "", role: "project_user", password: "" },
  })
  const create = $api.useMutation("post", "/users", { onSuccess: onClose })

  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title="New user"
      description="Share the temporary password; they change it from their account menu after logging in."
      submitLabel="Create user"
      isPending={create.isPending}
      onSubmit={form.handleSubmit((body) => create.mutate({ body }))}
    >
      <TextField control={form.control} name="name" label="Name" />
      <TextField control={form.control} name="email" label="Email" type="email" autoComplete="off" />
      <SelectField control={form.control} name="role" label="Role" options={options(ROLES)} />
      <PasswordField control={form.control} name="password" label="Temporary password" />
    </FormDialog>
  )
}

const editSchema = z.object({
  name: textRequired.max(120),
  role: z.enum(ROLE_VALUES),
  is_active: z.boolean(),
  password: z.string().refine((v) => v === "" || (v.length >= 6 && v.length <= 128), "At least 6 characters"),
})

function EditUserDialog({ userId, isSelf, onClose }: { userId: number; isSelf: boolean; onClose: () => void }) {
  const detail = $api.useQuery("get", "/users/{user_id}", { params: { path: { user_id: userId } } })
  const form = useForm<z.input<typeof editSchema>, unknown, z.output<typeof editSchema>>({
    resolver: zodResolver(editSchema),
    defaultValues: { name: "", role: "project_user", is_active: true, password: "" },
  })
  const { reset } = form
  React.useEffect(() => {
    const u = detail.data
    if (u) reset({ name: u.name, role: u.role as RoleValue, is_active: u.is_active, password: "" })
  }, [detail.data, reset])

  const update = $api.useMutation("put", "/users/{user_id}", { onSuccess: onClose })

  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={`Edit ${detail.data?.name ?? "user"}`}
      description={detail.data?.email}
      isPending={update.isPending}
      onSubmit={form.handleSubmit(({ password, ...body }) =>
        update.mutate({
          params: { path: { user_id: userId } },
          // The backend treats any `password` key (even null) as a reset, so only
          // send it when one was typed.
          body: password ? { ...body, password } : body,
        })
      )}
    >
      <TextField control={form.control} name="name" label="Name" />
      <SelectField
        control={form.control}
        name="role"
        label="Role"
        options={options(ROLES)}
        disabled={isSelf}
        description={isSelf ? "You can't change your own role." : undefined}
      />
      <SwitchField
        control={form.control}
        name="is_active"
        label="Active"
        description={isSelf ? "You can't deactivate your own account." : "Deactivated users can't log in."}
        disabled={isSelf}
      />
      <PasswordField
        control={form.control}
        name="password"
        label="Reset password"
        description="Leave blank to keep the current password."
      />
    </FormDialog>
  )
}
