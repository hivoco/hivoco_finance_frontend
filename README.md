# hivoco_finance_frontend

Web UI for the HiVoco Finance backend (`hivoco_finance_backend`, FastAPI).
API guide: `hivoco_finance_backend/docs/FRONTEND.md`. Libraries and why each is
here: [`TECH_STACK.md`](TECH_STACK.md). Build log + known backend issues: [`TODO.md`](TODO.md).

**Stack:** Vite · React 19 · TypeScript (strict) · Tailwind v4 · shadcn/ui · TanStack Query ·
Zustand · React Router · openapi-fetch/openapi-react-query · react-hook-form + zod.

## Run

```bash
cp .env.example .env.local     # VITE_API_BASE_URL — deployed API by default
npm install
npm run dev                    # http://localhost:5180
```

API: **https://api.finance.thefirstimpression.ai** (docs at `/docs`). This is the live
backend with real data — anything you create, finalize, sign off or lock from the UI is
written there. Log in with your own account (created by a super admin).

## Scripts

| Script | What |
|---|---|
| `npm run dev` | Dev server on port 5180 (pinned) |
| `npm run build` | Typecheck + production build (lazy pages, vendor chunks) |
| `npm run preview` / `npm start` | Serve the production build on port 6024 (pinned) |
| `npm run lint` | oxlint |
| `npm run gen:api` | Regenerate `src/lib/api/schema.d.ts` from the deployed OpenAPI — run after any backend API change, then `npm run build` to catch breakages |

## Screens

| Route | Screen | Endpoints |
|---|---|---|
| `/` | Dashboard — pipeline/booked/revenue/margin, aging | reports/company-dashboard, reports/cashflow |
| `/cashflow` | Cash flow as of a date | reports/cashflow |
| `/alerts` | SLA alerts — filters, acknowledge, run scan (SA) | alerts, alerts/{id}/ack, alerts/run |
| `/projects`, `/projects/:id` | Projects — filters, create/edit, P&L, dashboard, related POs/costs/credits | projects*, projects/{id}/pnl, reports/projects/{id}/dashboard |
| `/pos`, `/pos/:id` | Purchase orders — create with split, live balance, upload, lock | pos* |
| `/invoices`, `/invoices/:id` | Invoices — client→project→PO cascade, draft edit, finalize (SA), payment | invoices* |
| `/clients` | Client master (edit: SA) | clients* |
| `/costs`, `/costs/:id` | External costs — split, vendor invoice, upload, dual sign-off (SA), payment | costs* |
| `/vendors`, `/vendor-ledger` | Vendor master (edit: SA), outstanding per vendor | vendors*, reports/vendor-ledger |
| `/credits`, `/overhead` | Credits; overhead expenses + FY pool | credits, overhead/* |
| `/locks` | Month locks — lock/unlock with reason (SA) | locks* |
| `/audit` | Audit log (SA only) | audit |
| `/users` | Users (SA only) | users* |
| `/settings` | Live config (edit: SA) | settings* |
| user menu | Theme, change password, log out | auth/* |

61 of 62 endpoints are wired (`GET /health` isn't a screen).

## Layout

```
src/
  main.tsx                 providers + global mutation handling (invalidate, error toast)
  routes.tsx               lazy routes, super-admin guards, page titles
  config/nav.tsx           sidebar sections, role-gated (RBAC matrix, FRONTEND.md §7)
  stores/auth.ts           zustand: JWT (persisted)
  hooks/
    use-current-user.ts    GET /auth/me, useIsSuperAdmin
    use-lookups.ts         /lookup sources for dropdowns (client → project → PO cascade)
    use-name-maps.ts       id → name (API returns ids only)
    use-settings.ts        settings map, TDS slab options
  lib/
    api/client.ts          $api — typed TanStack Query hooks for every endpoint
    api/schema.d.ts        generated — do not edit
    api/errors.ts          FastAPI error → message
    enums.ts               FRONTEND.md §8 enums as options
    schemas.ts             shared zod pieces (money, dates, optional text)
    money.ts, format.ts    INR / date formatting, decimal sums
  components/
    ui/                    shadcn components
    form-fields.tsx        RHF-bound Text/Money/Date/Select/Switch/Lookup fields
    data-table.tsx         TanStack Table v9 list + offset pagination
    allocation-rows.tsx    per-project split editor + live balance indicator
    form-dialog.tsx, confirm-button.tsx, page-header.tsx, section-cards.tsx, …
  pages/                   one file per screen (detail pages: *-detail.tsx)
```

## Conventions

- Use a shadcn component or block before writing UI by hand; a library before a helper.
- Fetch with `$api.useQuery` / `$api.useMutation` — never hand-written fetch calls or query hooks.
- Money is a decimal **string** end to end; format with `formatINR`, calculate with `decimal.js`.
- Hide or disable actions a role can't perform; the server's 403 is the backstop. Three roles
  (`src/hooks/use-current-user.ts`): `useIsSuperAdmin` (approvals, invoices, masters, locks, users,
  settings), `useCanViewAll` (super_admin + view-only `admin`: company reports, audit) and
  `useCanEdit` (super_admin + `project_user`: create/edit projects, POs, costs, credits, overhead).
- Put forms with searchable dropdowns (`LookupField`) inside `FormDialog`: it gives the dropdown
  list a place inside the dialog (`src/lib/portal-container.ts`). A list rendered outside a Radix
  modal can't be clicked.
- Type: **Inter, weights 400 and 700 only** — use `font-normal` / `font-bold`. Titles, headings,
  key figures and a table's primary column are bold; buttons, labels, badges, table headers
  and body text are regular. `src/index.css` pins every other weight utility (e.g. `font-medium`
  from a newly added shadcn component) to 400/700 so nothing renders a faked weight.
- Colors: brand palette (black `#000000`, white `#FFFFFF`, grey `#F4F4F4`, lime `#A8E63D`)
  lives in `src/index.css` as `--brand-*`; use shadcn tokens, never literal colors.
  The lime is eyeballed, not official.
- Don't patch the backend from here — log backend issues in `TODO.md`.
