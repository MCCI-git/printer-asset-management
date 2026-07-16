# Printer Asset Management — Project Context

Read this file at the start of every session. It is the single source of truth for project architecture, decisions, and gotchas.

---

## What this app is

An internal web app for managing a fleet of printers. It tracks assets, costs (CAPEX/OPEX), consumables, maintenance work orders, contracts, suppliers, and an annual budget. It also manages student printing plans at a university print centre, integrates with Snipe-IT for asset syncing, and pulls live printer data via SNMP.

**Deployed on a Synology NAS** running Docker. Accessed via browser on the local network at `http://<NAS_IP>:8900`.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Recharts, TanStack Query v5, Axios |
| Backend | Laravel 11, PHP 8.4 |
| Auth | Laravel Sanctum — Bearer token stored in `localStorage`, sent as `Authorization: Bearer <token>` |
| Database | MySQL 8 |
| Container | Single `pam_app` container — PHP 8.4-fpm + nginx + Laravel scheduler, managed by **supervisord** |

---

## Project structure

```
/
├── backend/
│   ├── app/
│   │   ├── Http/Controllers/Api/     One controller per domain
│   │   │   ├── AuthController
│   │   │   ├── PrinterController
│   │   │   ├── ConsumableController
│   │   │   ├── ContractController
│   │   │   ├── SupplierController
│   │   │   ├── WorkOrderController
│   │   │   ├── BudgetController
│   │   │   ├── DashboardController
│   │   │   ├── TopAccessController   (SNMP)
│   │   │   ├── PrintManagerController
│   │   │   ├── SmtpController        (SMTP config + alert dispatch)
│   │   │   ├── SnipeItController
│   │   │   ├── UserController
│   │   │   ├── ActivityLogController
│   │   │   ├── NetworkScanController
│   │   │   ├── PrinterPageCountController
│   │   │   └── TonerModelController
│   │   ├── Models/
│   │   │   ├── Printer, Consumable, ConsumableAssignment
│   │   │   ├── Contract, ContractRenewal
│   │   │   ├── Supplier, WorkOrder
│   │   │   ├── Budget, PrinterPageCount
│   │   │   ├── PrintPlan, PrintStudent, PrintPurchase
│   │   │   ├── ActivityLog, AppSetting, TonerModel
│   │   │   └── User, Category, Location
│   │   ├── Services/
│   │   │   ├── AlertService.php      email alert logic + dedup
│   │   │   ├── TopAccessService.php  SNMP queries (RFC 3805 MIB)
│   │   │   ├── SnipeItService.php    Snipe-IT API sync
│   │   │   ├── ActivityLogger.php    static log() + diff() helpers
│   │   │   └── Calendar.php          currentYear() helper
│   │   ├── Mail/AlertDigest.php
│   │   └── Console/Commands/
│   │       ├── SendAlertDigest       `alerts:send [--force]`
│   │       ├── ContractsExpire       `contracts:expire`
│   │       └── SnipeItSync           `snipeit:sync`
│   ├── routes/
│   │   ├── api.php                   all routes under auth:sanctum except /login, /register
│   │   └── console.php               scheduler — alerts:send every minute, contracts:expire daily at 00:05
│   ├── docker/
│   │   ├── nginx.conf                listens 8900; /api/ and /sanctum/ → fastcgi 127.0.0.1:9001
│   │   └── php-fpm-pool.conf         www pool on port 9001
│   ├── supervisord.conf              manages php-fpm, nginx, scheduler
│   └── Dockerfile.prod               two-stage: Node 20 builds React → PHP 8.4-fpm-alpine
│
├── frontend/
│   ├── src/
│   │   ├── pages/                    one file per tab
│   │   │   Dashboard, Budget, Printers, Capex, Opex, Consumables,
│   │   │   Contracts, Suppliers, Maintenance, TopAccess,
│   │   │   PrintManager, Reports, SnipeIt, Admin, Login
│   │   ├── components/
│   │   │   ├── layout/Sidebar.tsx    nav + role colour system + printer logo tint
│   │   │   ├── layout/ProfileSheet.tsx
│   │   │   └── ui/                   shadcn/ui (dialog.tsx, badge.tsx, etc.)
│   │   ├── hooks/useData.ts          ALL TanStack Query hooks — single source of truth
│   │   ├── services/api.ts           ALL Axios calls — single source of truth
│   │   ├── types/index.ts            TypeScript interfaces for all domain objects
│   │   ├── context/AuthContext.tsx   Sanctum token auth context
│   │   └── lib/
│   │       ├── exportReport.ts       CSV / PDF export for Reports tab
│   │       └── timeline.ts           CURRENT_YEAR constant
│   └── vite.config.ts                proxies /api and /sanctum → localhost:8000 in dev
│
├── docker-compose.prod.yml           pam_app + pam_db + pam_phpmyadmin on pam_net bridge
└── CONTEXT.md                        this file
```

---

## Docker setup (production)

Three containers on the `pam_net` bridge network:

| Container | Image | Port |
|---|---|---|
| `pam_app` | custom (Dockerfile.prod) | `8900` → `8900` |
| `pam_db` | mysql:8.0 | internal only |
| `pam_phpmyadmin` | phpmyadmin:latest | `8901` → `80` |

**Why PHP-FPM runs on port 9001 (not 9000):** Synology DSM reserves port 9000 for its own PHP-FPM on the host. Using 9000 would cause a silent bind failure.

**Why everything is in one container:** Avoids inter-container networking on Synology which also reserves port 3306 (MariaDB). nginx and PHP-FPM communicate over localhost inside `pam_app`.

**supervisord** manages three processes: `php-fpm`, `nginx -g "daemon off;"`, and the scheduler loop (`while true; do php artisan schedule:run; sleep 60; done`).

**Two-stage Dockerfile.prod build:**
1. Node 20 alpine — builds React frontend into `/app/dist`
2. PHP 8.4-fpm-alpine — installs nginx, supervisor, net-snmp, PHP extensions (pdo_mysql, mbstring, gd, zip, snmp, bcmath, pcntl), copies Laravel backend and built frontend

**Required `.env` vars for production** (set in `docker-compose.prod.yml` environment block):
```
APP_KEY, APP_URL, DB_PASSWORD, DB_ROOT_PASSWORD, APP_PORT (default 8900)
```

---

## Deployment commands

```bash
# Pull latest
git pull origin main

# Rebuild and restart
docker compose -f docker-compose.prod.yml up -d --build

# Run migrations (after schema changes)
docker exec pam_app php artisan migrate --force

# Trigger alert email manually
docker exec pam_app php artisan alerts:send --force

# View logs
docker logs pam_app -f
```

---

## Role system

Four roles: `super-admin`, `admin`, `reports`, `view`.

Role colours are applied to: active nav pill, nav text, sidebar printer logo icon, and role badge.

| Role | Colour |
|---|---|
| `super-admin` | `#800040` (burgundy) |
| `admin` | `#1e40af` (blue) |
| `reports` | `#92400e` (amber) |
| `view` | `#166534` (green) |

Defined in `Sidebar.tsx` as `roleActiveStyle` (drives nav + logo) and in `badge.tsx` as `role-*` variant classes.

**Tab visibility by role** (defined as `roles` array on each item in `allNavItems` in `Sidebar.tsx`):

| Tab | Roles that can see it |
|---|---|
| Dashboard, Budget, Printers, CAPEX, OPEX, Consumables, Contracts, Suppliers, Maintenance, TopAccess, Reports | super-admin, admin, reports, view |
| Print Manager | super-admin, admin |
| Snipe-IT, Admin | super-admin only |

A horizontal separator renders above Snipe-IT (`separator: true` on that nav item).

---

## Data models (key fields)

### Printer
`cost_type` (CAPEX/OPEX), `purchase_cost`, `purchase_date`, `monthly_fixed_cost`, `per_page_cost`, `status` (active/maintenance/retired/lost), `ip_address`, `snmp_community`, `snmp_status` (fetched/failed/null), `snmp_toner` (JSON array), `snmp_total_pages`, `snmp_model`, `snmp_serial`, `snmp_printer_status`, `snmp_fetched_at`, `next_service_date`, `last_service_date`, `service_count`. Belongs to `Category` and `Location`.

### Consumable
`type` (Toner/Paper/Drum/Waste/Maintenance Kit), `color` (Black/Cyan/Magenta/Yellow), `unit_cost`, `quantity` (signed int — can go negative), `low_stock_threshold`, `purchase_date`, `invoice_number`, `supplier_id`, `printer_id`.

### Contract
`type` (Service/Support/Lease/Maintenance), `start_date`, `end_date`, `annual_cost`, `notice_period_days`, `status` (active/expired/pending), `supplier_id`, `covered_printers`, `pdf_path`.

### WorkOrder
`wo_number`, `printer_id`, `issue`, `priority` (high/medium/low), `status` (open/in-progress/scheduled/completed/cancelled), `scheduled_date`, `completed_date`, `cost`, `supplier_id`. **No soft deletes — hard delete.**

### User
`role` (super-admin/admin/reports/view), `status` (active/inactive/locked), `avatar`.

### Budget
One row per `(year, type)`. Types: `total`, `capex`, `opex`. Amounts set via Admin → Budget tab. No `actual` type stored — actuals are always computed live.

---

## Budget breakdown logic (BudgetController)

`GET /api/budgets/breakdown?year=YYYY` — powers the Breakdown card in the Budget tab.

| UI row | DB source | Has budget? |
|---|---|---|
| Printer Purchases (CAPEX) | `printers.purchase_cost` WHERE `cost_type='CAPEX'` AND `purchase_date` in year | ✓ from `budgets[capex]` |
| Lease Fees | `printers.monthly_fixed_cost × 12` WHERE `cost_type='OPEX'` AND `status='active'` | — |
| Consumables | `SUM(unit_cost × quantity)` using `COALESCE(purchase_date, created_at)` in year | — |
| Maintenance Contracts | `contracts.annual_cost` prorated, WHERE `type='Maintenance'` | — |
| Support Contracts | prorated, WHERE `type='Support'` | — |
| Service Contracts | prorated, WHERE `type='Service'` | — |
| Lease Contracts | prorated, WHERE `type='Lease'` | ✓ from `budgets[opex]` |
| Work Orders | `work_orders.cost` WHERE `status='completed'` AND `completed_date` in year | — |

**Prorating formula:** `(annual_cost ÷ 365) × days the contract was active within the year`

**COALESCE on consumables:** `whereRaw('YEAR(COALESCE(purchase_date, created_at)) = ?', [$year])` — ensures consumables without a `purchase_date` still count in the year they were added to inventory.

**Budget cache invalidation:** Mutations for contracts (create/update/delete) invalidate `budgets-actual`, `budgets-breakdown`, `budgets-all` in React Query. Work order mutations do **not** currently invalidate budget queries (reverted — was a known issue). Printer and consumable mutations do not invalidate budget queries.

---

## TanStack Query patterns

- All queries and mutations live in `frontend/src/hooks/useData.ts` — never call `api.ts` directly from pages
- All API calls live in `frontend/src/services/api.ts` — single source of truth for endpoints
- `dashboard-stats` and budget queries refetch every 30 seconds
- Contracts query has `refetchOnWindowFocus: false`
- Mutations invalidate related queries in `onSuccess` — see `useData.ts` for the full map

---

## Dialog width system

The base `DialogContent` in `frontend/src/components/ui/dialog.tsx` has **no** default `sm:max-w-*` class — it was removed because Tailwind's responsive prefix (`sm:`) has higher specificity than unprefixed utilities and silently overrides custom widths passed via `className`.

Each dialog specifies its own width, e.g.:
```tsx
<DialogContent className="w-[416px] max-w-none sm:max-w-none">
```

**Tailwind calc() gotcha:** `w-[calc(36rem-160px)]` silently fails — spaces required around `-`. Prefer fixed pixel values like `w-[416px]`.

---

## SNMP / TopAccess

`TopAccessService` uses standard Printer MIB-II OIDs (RFC 3805). The PHP `snmp` extension must be loaded in the container (installed via `apk add net-snmp-dev` + `docker-php-ext-install snmp`).

- `getPrinters()` — reads cached `snmp_*` columns from DB, no live network call
- `fetchAllLive()` — queries all IP-assigned printers live, writes results back to DB
- `queryPrinter($printer)` — single printer live query; marks `snmp_status = 'fetched'` or `'failed'`
- `testConnection($ip, $community)` — probe only, no DB write
- `probeIp($ip, $community)` — TCP reachability check first (ports 9100, 515, 631), then SNMP

Toner slots polled: indices 1–4. Missing slots return `false` and are skipped.

Community string defaults to `'public'` if not set on the printer.

---

## Email alerts (AlertService)

Scheduler runs `alerts:send` every minute. `AlertService::send()` uses a **24-hour content-hash dedup** — only sends when alert state changes. Skips entirely if no recipients configured or SMTP/notification config files don't exist.

Config stored as JSON files (not in DB):
- `storage/app/smtp_config.json` — SMTP credentials
- `storage/app/notification_config.json` — recipient list + toggles

**Four alert conditions (each togglable in Admin):**
1. `alert_out_of_stock` — consumable quantity ≤ 0
2. `alert_low_stock` — 0 < quantity ≤ low_stock_threshold
3. `alert_contract_expiry` — active contracts within their `notice_period_days` window
4. `alert_overdue_service` — active printers where `next_service_date < today`

**Immediate stock alert:** `sendStockAlert()` fires when a consumable is saved and crosses a threshold. Has a **1-hour per-consumable dedup** (`Cache::put("stock_alert_{id}_{quantity}", ...)`) to prevent spam on repeated edits.

Manual trigger: `php artisan alerts:send --force` bypasses the 24-hour dedup.

---

## Print Manager email template

The email body editor is a `contentEditable` div with `ref={bodyRef}`. It only exists in the DOM when the `students` tab is active (conditional render).

**Dual-state pattern to handle this:**
- `emailBodyHtml` (state) — always populated from API on mount; used by `getPreview()` and `sendEmail()` as fallback
- `savedTemplateRef` (ref) — holds template across tab switches without re-renders
- `bodyRef` (ref) — populated via `setTimeout(0)` when students tab becomes active

**Template placeholders:** `[STUDENT_NAME]`, `[PRINTER_ID]`, `[PLAN_NAME]`

---

## Activity logging

`ActivityLogger::log()` is a static helper called from controllers after mutations. It records: `user_id`, `user_name`, `action`, `model_type`, `model_id`, `model_label`, `description`, and a `properties` JSON diff (old/new values for changed fields). `ActivityLogger::diff()` builds the diff array, skipping `updated_at`, `created_at`, and any non-scalar fields.

---

## Sensitive files (never commit)

- `backend/.env`
- `backend/storage/app/smtp_config.json`
- `backend/storage/app/notification_config.json`
- `backend/storage/app/snipeit_config.json`

These are persisted via the `pam_storage` Docker volume.
