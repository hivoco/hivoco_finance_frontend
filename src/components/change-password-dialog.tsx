import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { FormDialog } from "@/components/form-dialog"
import { PasswordField } from "@/components/form-fields"
import { $api } from "@/lib/api/client"

const schema = z
  .object({
    old_password: z.string().min(1, "Required"),
    new_password: z.string().min(6, "At least 6 characters").max(128),
    confirm: z.string(),
  })
  .refine((v) => v.new_password === v.confirm, { path: ["confirm"], message: "Passwords don't match" })

export function ChangePasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const form = useForm<z.input<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { old_password: "", new_password: "", confirm: "" },
  })
  const change = $api.useMutation("post", "/auth/change-password", {
    onSuccess: () => {
      toast.success("Password changed")
      form.reset()
      onOpenChange(false)
    },
  })

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Change password"
      submitLabel="Change password"
      isPending={change.isPending}
      onSubmit={form.handleSubmit(({ old_password, new_password }) =>
        change.mutate({ body: { old_password, new_password } })
      )}
    >
      <PasswordField
        control={form.control}
        name="old_password"
        label="Current password"
        autoComplete="current-password"
      />
      <PasswordField control={form.control} name="new_password" label="New password" />
      <PasswordField control={form.control} name="confirm" label="Confirm new password" />
    </FormDialog>
  )
}
