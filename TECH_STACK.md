# Tech stack — HiVoco Finance frontend

Every library in `package.json`, what it does here, and whether it can be dropped.
**Rule:** prefer a maintained library (or a shadcn component/block) over hand-written
code. When you add or remove a dependency, update this file in the same change.

Status legend: **core** = app is built on it · **in use** = used by current screens ·
**tooling** = dev/build only.

## Core stack

| Library | Version | Role | Status |
|---|---|---|---|
| `vite` + `@vitejs/plugin-react` | 8 / 6 | Dev server + build. Vendor chunks split in `vite.config.ts` | core |
| `react`, `react-dom` | 19 | UI | core |
| `typescript` | ~5.9 | Types, `strict` on. Pinned to 5.x because `openapi-typescript` peers on `typescript@^5` (the Vite template ships 6, which is strict by default — so `strict: true` is set explicitly) | core |
| `tailwindcss` + `@tailwindcss/vite` | 4 | Styling | core |
| `@tanstack/react-query` | 5 | All server state. Every successful mutation invalidates active queries (`main.tsx`) | core |
| `zustand` | 5 | Client state: the JWT, persisted to localStorage (`src/stores/auth.ts`) | core |
| `react-router` | 8 | Routing, lazy-loaded pages, auth guard, page titles via `handle` | core |

## API layer

| Library | Role | Status |
|---|---|---|
| `openapi-typescript` (dev) | Generates `src/lib/api/schema.d.ts` from the deployed `/openapi.json` — `npm run gen:api` | tooling |
| `openapi-fetch` | Typed fetch client; middleware adds `Authorization: Bearer` and logs out on 401; passes `FormData` through for uploads | core |
| `openapi-react-query` | TanStack Query hooks straight from the schema: `$api.useQuery("get", "/clients")` — no hand-written hooks. All 61 screen endpoints use it | core |
| `@tanstack/react-query-devtools` (dev) | Query inspector (bottom-left, dev only) | tooling |

## UI — shadcn/ui

Initialised with `radix` base + `vega` preset (`neutral`), themed with the brand palette
in `src/index.css`. Components live in `src/components/ui/` — add with
`npx shadcn@latest add <name>`. Blocks used as starting points: `login-03`, `sidebar-07`,
`dashboard-01` (shell, site header, section cards, data table pattern).

| Library | Role | Status |
|---|---|---|
| `shadcn` | CLI + `shadcn/tailwind.css` base styles | core |
| `radix-ui` | Primitives behind dialog, select, popover, dropdown, switch, tooltip, sheet… | core |
| `@base-ui/react` | Primitive behind the shadcn `combobox` (searchable lookup dropdowns) | in use |
| `cn` | Class merging (shadcn v4 replacement for clsx + tailwind-merge) | core |
| `class-variance-authority` | Component variants | core |
| `tw-animate-css` | Animations for shadcn components | core |
| `lucide-react` | Icons | in use |
| `sonner` | Toasts; failed mutations toast the backend `detail` globally | in use |
| `next-themes` | Dark/light theme (default dark). Framework-agnostic despite the name | in use |
| `@fontsource/inter` | Self-hosted Inter, **static 400 + 700 only**, latin + latin-ext subsets (latin-ext has ₹). Replaced `@fontsource-variable/inter` (all weights) | in use |
| `react-day-picker` | Behind shadcn `calendar` (date pickers) | in use |

## Forms, dates, money

| Library | Role | Status |
|---|---|---|
| `react-hook-form` | Form state for every create/edit dialog; `useFieldArray` for project splits | in use |
| `zod` | Form schemas; shared pieces in `src/lib/schemas.ts` | in use |
| `@hookform/resolvers` | Connects zod to react-hook-form | in use |
| `decimal.js` | Money math — allocation balance, TDS / net-payable preview, cash-flow totals. Never JS floats | in use |
| `date-fns` | Date parse/format (`src/lib/format.ts`, date pickers) | in use |
| `use-debounce` | Debounced search inputs and lookup queries | in use |

Money display uses the built-in `Intl.NumberFormat("en-IN")` on the decimal string.

## Tables

| Library | Role | Status |
|---|---|---|
| `@tanstack/react-table` (v9) | `src/components/data-table.tsx` — every list screen | in use |

## Lint

| Library | Role | Status |
|---|---|---|
| `oxlint` | Linter — `npm run lint` (only fast-refresh warnings remain) | tooling |
| `@types/node` | Node types for `vite.config.ts` | tooling |

## Removed (2026-09-17)

Came in with shadcn blocks/components but no screen used them. Re-add with
`npx shadcn@latest add <component>` if needed.

| Removed | Came with | Re-add |
|---|---|---|
| `@dnd-kit/*` | dashboard-01 sample table (drag rows) | — |
| `recharts` | `chart` component | `npx shadcn@latest add chart` |
| `vaul` | `drawer` component | `npx shadcn@latest add drawer` |
| `cmdk` | `command` component | `npx shadcn@latest add command` |
| ui files: breadcrumb, checkbox, collapsible, native-select, pagination, tabs, toggle, toggle-group | blocks / early setup | `npx shadcn@latest add <name>` |
