import * as React from "react"
import { parseISO } from "date-fns"
import { CalendarIcon, EyeIcon, EyeOffIcon } from "lucide-react"
import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
} from "react-hook-form"
import { useDebounce } from "use-debounce"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { formatDate, toApiDate } from "@/lib/format"
import { usePortalContainer } from "@/lib/portal-container"

// react-hook-form bindings for shadcn Field components (pattern from the shadcn
// "Forms → React Hook Form" guide). Every field: label, description, error.

type BaseProps<T extends FieldValues> = {
  // any/any: accept forms whose zod schema transforms values (input ≠ output)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<T, any, any>
  name: FieldPath<T>
  label: string
  description?: React.ReactNode
  disabled?: boolean
}

function FieldShell({
  id,
  label,
  description,
  error,
  children,
  orientation,
}: {
  id: string
  label: string
  description?: React.ReactNode
  error?: { message?: string }
  children: React.ReactNode
  orientation?: "horizontal"
}) {
  if (orientation === "horizontal") {
    return (
      <Field orientation="horizontal" data-invalid={!!error}>
        <FieldContent>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          {description && <FieldDescription>{description}</FieldDescription>}
          {error && <FieldError errors={[error]} />}
        </FieldContent>
        {children}
      </Field>
    )
  }
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {children}
      {description && <FieldDescription>{description}</FieldDescription>}
      {error && <FieldError errors={[error]} />}
    </Field>
  )
}

export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  disabled,
  ...inputProps
}: BaseProps<T> & Omit<React.ComponentProps<typeof Input>, "name">) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FieldShell id={name} label={label} description={description} error={fieldState.error}>
          <Input
            {...inputProps}
            {...field}
            value={field.value ?? ""}
            id={name}
            disabled={disabled}
            aria-invalid={fieldState.invalid}
          />
        </FieldShell>
      )}
    />
  )
}

export function TextareaField<T extends FieldValues>({ control, name, label, description, disabled }: BaseProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FieldShell id={name} label={label} description={description} error={fieldState.error}>
          <Textarea {...field} value={field.value ?? ""} id={name} disabled={disabled} aria-invalid={fieldState.invalid} />
        </FieldShell>
      )}
    />
  )
}

/** Password input with a show/hide toggle. */
export function PasswordField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  disabled,
  autoComplete = "new-password",
}: BaseProps<T> & { autoComplete?: string }) {
  const [visible, setVisible] = React.useState(false)
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FieldShell id={name} label={label} description={description} error={fieldState.error}>
          <InputGroup>
            <InputGroupInput
              {...field}
              value={field.value ?? ""}
              id={name}
              type={visible ? "text" : "password"}
              autoComplete={autoComplete}
              disabled={disabled}
              aria-invalid={fieldState.invalid}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-xs"
                onClick={() => setVisible((v) => !v)}
                aria-label={visible ? "Hide password" : "Show password"}
                aria-pressed={visible}
                disabled={disabled}
              >
                {visible ? <EyeOffIcon /> : <EyeIcon />}
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </FieldShell>
      )}
    />
  )
}

/** Decimal-string money input with a ₹ prefix. Never converts to a JS number. */
export function MoneyField<T extends FieldValues>({ control, name, label, description, disabled }: BaseProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FieldShell id={name} label={label} description={description} error={fieldState.error}>
          <InputGroup>
            <InputGroupAddon>
              <InputGroupText>₹</InputGroupText>
            </InputGroupAddon>
            <InputGroupInput
              {...field}
              value={field.value ?? ""}
              id={name}
              inputMode="decimal"
              placeholder="0.00"
              disabled={disabled}
              aria-invalid={fieldState.invalid}
              className="tabular-nums"
            />
          </InputGroup>
        </FieldShell>
      )}
    />
  )
}

/** Date picker (shadcn Calendar in a Popover). Value is an API date string "yyyy-MM-dd". */
export function DatePicker({
  id,
  value,
  onChange,
  disabled,
  invalid,
  placeholder = "Pick a date",
  className,
  maxDate,
}: {
  id?: string
  value?: string | null
  /** Latest selectable day ("yyyy-MM-dd"); later days are disabled and months beyond it hidden. */
  maxDate?: string
  onChange: (value: string) => void
  disabled?: boolean
  invalid?: boolean
  placeholder?: string
  className?: string
}) {
  const [open, setOpen] = React.useState(false)
  const max = maxDate ? parseISO(maxDate) : undefined
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-invalid={invalid}
          className={`justify-start font-normal data-[empty=true]:text-muted-foreground ${className ?? ""}`}
          data-empty={!value}
        >
          <CalendarIcon />
          {value ? formatDate(value) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          captionLayout="dropdown"
          selected={value ? parseISO(value) : undefined}
          defaultMonth={value ? parseISO(value) : undefined}
          disabled={max ? { after: max } : undefined}
          endMonth={max}
          onSelect={(date) => {
            onChange(date ? toApiDate(date) : "")
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

export function DateField<T extends FieldValues>({ control, name, label, description, disabled }: BaseProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FieldShell id={name} label={label} description={description} error={fieldState.error}>
          <DatePicker
            id={name}
            value={field.value}
            onChange={field.onChange}
            disabled={disabled}
            invalid={fieldState.invalid}
          />
        </FieldShell>
      )}
    />
  )
}

export type Option = { value: string; label: string }

export function SelectField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  disabled,
  options,
  placeholder = "Select…",
}: BaseProps<T> & { options: Option[]; placeholder?: string }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FieldShell id={name} label={label} description={description} error={fieldState.error}>
          <Select value={field.value ?? ""} onValueChange={field.onChange} disabled={disabled}>
            <SelectTrigger id={name} aria-invalid={fieldState.invalid} className="w-full">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldShell>
      )}
    />
  )
}

export function SwitchField<T extends FieldValues>({ control, name, label, description, disabled }: BaseProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FieldShell
          id={name}
          label={label}
          description={description}
          error={fieldState.error}
          orientation="horizontal"
        >
          <Switch id={name} checked={!!field.value} onCheckedChange={field.onChange} disabled={disabled} />
        </FieldShell>
      )}
    />
  )
}

export type LookupItem = { id: number; label: string; hint?: string }

/**
 * Searchable dropdown backed by a /lookup endpoint (FRONTEND.md §4).
 * `useItems(search)` returns the server-filtered items; value is the item id.
 */
export function LookupField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  disabled,
  placeholder = "Search…",
  useItems,
  onSelect,
  getLabel,
}: BaseProps<T> & {
  placeholder?: string
  useItems: (search: string) => { items: LookupItem[]; isLoading: boolean }
  onSelect?: (item: LookupItem | null) => void
  /** Label for an already-saved id that is not in the current search results. */
  getLabel?: (id: number) => string
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FieldShell id={name} label={label} description={description} error={fieldState.error}>
          <LookupCombobox
            id={name}
            value={field.value ?? null}
            onChange={(item) => {
              field.onChange(item?.id ?? null)
              onSelect?.(item)
            }}
            useItems={useItems}
            placeholder={placeholder}
            disabled={disabled}
            invalid={fieldState.invalid}
            getLabel={getLabel}
          />
        </FieldShell>
      )}
    />
  )
}

/** Unbound lookup combobox — also used for list-page filters. */
export function LookupCombobox({
  id,
  value,
  onChange,
  useItems,
  placeholder = "Search…",
  disabled,
  invalid,
  className,
  getLabel,
}: {
  getLabel?: (id: number) => string
  id?: string
  value: number | null
  onChange: (item: LookupItem | null) => void
  useItems: (search: string) => { items: LookupItem[]; isLoading: boolean }
  placeholder?: string
  disabled?: boolean
  invalid?: boolean
  className?: string
}) {
  // Inside a FormDialog this is the dialog element, so the list stays clickable.
  const portalContainer = usePortalContainer()
  const [search, setSearch] = React.useState("")
  const [debounced] = useDebounce(search, 250)
  const { items, isLoading } = useItems(debounced)
  // Remember the chosen item so its label survives a new search result set.
  const [selected, setSelected] = React.useState<LookupItem | null>(null)
  const current =
    value === null
      ? null
      : (items.find((i) => i.id === value) ??
        (selected?.id === value ? selected : getLabel ? { id: value, label: getLabel(value) } : null))

  return (
    <Combobox<LookupItem>
      items={items}
      filter={null}
      value={current}
      onValueChange={(item) => {
        setSelected(item)
        onChange(item)
      }}
      onInputValueChange={(text, details) => {
        if (details.reason !== "item-press") setSearch(text)
      }}
      itemToStringLabel={(item) => item.label}
      isItemEqualToValue={(a, b) => a.id === b.id}
      disabled={disabled}
    >
      <ComboboxInput
        id={id}
        placeholder={value !== null && !current ? `#${value}` : placeholder}
        aria-invalid={invalid}
        showClear={value !== null}
        className={className ?? "w-full"}
      />
      <ComboboxContent container={portalContainer}>
        <ComboboxEmpty>{isLoading ? "Searching…" : "No matches."}</ComboboxEmpty>
        <ComboboxList>
          {(item: LookupItem) => (
            <ComboboxItem key={item.id} value={item}>
              <span className="truncate">{item.label}</span>
              {item.hint && <span className="ml-auto truncate text-xs text-muted-foreground">{item.hint}</span>}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
