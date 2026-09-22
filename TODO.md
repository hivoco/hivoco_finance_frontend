# Frontend build plan

API: https://api.finance.thefirstimpression.ai — 62 endpoints, **61 wired** (`GET /health` isn't a screen).
Verified: `tsc` (strict) + `vite build` per step; headless-Chrome smoke test of the production
build (login renders, unauthenticated routes redirect). **Not yet verified: click-through with
real data — needs a login on the deployed API.**

| # | Step | Endpoints | Est. | Status |
|---|---|---|---|---|
| 0 | Shared: data table, page header, form dialog, lookup combobox, date picker, money field, status badges, role gate | — | 30m | ✅ |
| 1 | Clients — list/search, create, edit | 5 | 15m | ✅ |
| 2 | Vendors — list/search, create, edit | 5 | 10m | ✅ |
| 3 | Projects — list/filters, create/edit, detail with P&L + dashboard | 7 | 25m | ✅ |
| 4 | Purchase orders — list, create with allocations, allocation editor (live balance), upload, lock | 7 | 35m | ✅ |
| 5 | Invoices — list/filters, create (client→project→PO cascade), edit draft, finalize, payment | 6 | 35m | ✅ |
| 6 | External costs — create (project or split), vendor invoice, upload, dual sign-off, payment | 7 | 35m | ✅ |
| 7 | Credits + Overhead (expenses, pool) | 5 | 20m | ✅ |
| 8 | Cash flow (as_of) + Vendor ledger | 2 | 15m | ✅ |
| 9 | SLA alerts — list/filters, acknowledge, run scan | 3 | 15m | ✅ |
| 10 | Month locks (lock/unlock) + Audit log | 4 | 20m | ✅ |
| 11 | Users, Settings, Change password | 7 | 25m | ✅ |
| 12 | Final pass — lazy routes, vendor chunks, strict TS, unused deps removed, docs | — | 15m | ✅ |

Legend: ⬜ todo · ⏳ in progress · ✅ done

## Next

- [ ] Click through every screen with a real super_admin and a project_user login.
- [ ] Decide with backend team on the issues below; adjust UI if endpoints change (`npm run gen:api` + build).

## Backend issues found (report to backend team — do not patch)

- Vendor `default_payment_terms_days` is never applied to costs: `core/api/routes/costs.py:71`
  stores `body.payment_terms_days` (None) and `costs.py:118` falls back to 0 → payables
  age from the vendor invoice date. *Frontend workaround:* the create-cost and vendor-invoice
  forms pre-fill the vendor's default terms, so costs created from the UI send them.
- Project `status` never auto-advances (pipeline → booked → invoiced_*); only `PUT /projects/{id}`
  changes it. The UI exposes status in the project edit dialog.
- List/detail responses carry ids only (`client_id`, `vendor_id`, `signed_by`, `changed_by`), no
  names. The UI resolves names by paging through the full client/vendor/project/PO/user lists
  (`src/hooks/use-name-maps.ts`) — fine now, heavy once those lists get large.
- `PUT /users/{id}` treats an explicit `"password": null` as a reset and calls
  `hash_password(None)` → 500 (`core/api/routes/users.py`, `"password" in data`). It should
  ignore null. *Frontend:* omits `password` unless one is typed.
- `PUT /users/{id}` lets a super admin change their own role (only self-deactivation is
  blocked). *Frontend:* role is locked when editing yourself.
- `PUT /invoices/{id}` recomputes `amount_expected` from the **stored** `client_tds_amount`
  (`invoices.py:142`) and only then applies the new TDS from the body (`:146-147`), so changing
  TDS on a draft leaves `amount_expected` stale. A null TDS also hits the NOT NULL column → 500.
  *Frontend:* sends a TDS change in its own request first, then the value; blank TDS → `"0"`.
- `PUT /invoices/{id}` doesn't recompute `expected_payment_date` when `invoice_date` changes.
- Lists return arrays without a total count → prev/next pagination only.
- `/users` is super_admin-only, so project_users see "User #id" for owners/sign-offs.
- No presigned-URL endpoint for private S3 files (`presign()` exists in `core/services/storage.py`
  but no route exposes it), so uploaded PO docs, vendor invoices and invoice PDFs can't be opened
  from the browser (private bucket → AccessDenied).
- `POST /invoices/{id}/finalize` always sets `invoice_pdf_url` to the `s3-pending://` placeholder,
  overwriting a PDF uploaded via `POST /invoices/{id}/upload` while the invoice was a draft. It should
  keep an existing real URL. *Frontend:* finalize dialog tells users to upload after finalizing.
- `GET /projects` has no `assigned_user_id` filter, so there's no "my projects" view for admins.
