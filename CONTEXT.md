# Printer Asset Management — Project Context

This file exists to give an AI coding assistant full context about this project without needing a conversation history.

---

## What this app is

An internal web app for managing a fleet of printers. It tracks assets, costs (CAPEX/OPEX), consumables, maintenance work orders, contracts, suppliers, and an annual budget. It also manages student printing plans at a university print centre, integrates with Snipe-IT for asset syncing, and pulls live printer data via SNMP.

**Deployed on a Synology NAS** running Docker. Accessed via browser on the local network at port `8900`.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Recharts, TanStack Query v5 |
| Backend | Laravel 11, PHP 8.4, Laravel Sanctum (token auth) |
| Database | MySQL 8 (separate `pam_db` container) |
| Container | Single `pam_app` container — PHP-FPM (port 9001) + nginx (port 8900) + scheduler, all managed by supervisord |
| Auth | Sanctum Bearer token stored in `localStorage` |

---

## Project structure

```
/
├── backend/                        Laravel API
│   ├── app/
│   │   ├── Http/Controllers/Api/   One controller per domain
│   │   ├── Models/                 Eloquent models
│   │   ├── Services/               AlertService, TopAccessService (SNMP), SnipeItService, Calendar
│   │   ├── Mail/AlertDigest.php    Email mailable for alert digests
│   │   └── Console/Commands/       SendAlertDigest, ContractsExpire, SnipeItSync
│   ├── routes/api.php              All API routes (all under auth:sanctum except login/register)
│   ├── routes/console.php          Scheduler — alerts:send every minute, contracts:expire daily
│   ├── docker/
│   │   ├── nginx.conf              Listens on 8900; /api/ and /sanctum/ → fastcgi 127.0.0.1:9001
│   │   └── php-fpm-pool.conf       www pool on port 9001 (avoids Synology DSM port 9000 conflict)
│   ├── supervisord.conf            Manages php-fpm, nginx, scheduler
│   └── Dockerfile.prod             Two-stage build: Node 20 builds React → PHP 8.4-fpm-alpine
│
├── frontend/
│   ├── src/
│   │   ├── pages/                  One file per tab (Dashboard, Printers, Capex, Opex, Consumables,
│   │   │                           Contracts, Suppliers, Maintenance, Budget, Reports,
│   │   │                           TopAccess, PrintManager, SnipeIt, Admin)
│   │   ├── components/
│   │   │   ├── layout/Sidebar.tsx  Nav + role-based colour system + printer logo tint
│   │   │   ├── layout/ProfileSheet.tsx
│   │   │   └── ui/                 shadcn/ui components (dialog.tsx, badge.tsx, etc.)
│   │   ├── hooks/useData.ts        ALL TanStack Query hooks — mutations invalidate related queries
│   │   ├── services/api.ts         ALL Axios calls — single source of truth for API endpoints
│   │   ├── types/index.ts          TypeScript interfaces for all domain objects
│   │   ├── context/AuthContext.tsx Sanctum token auth context
│   │   └── lib/
│   │       ├── exportReport.ts     CSV/PDF export logic for Reports tab
│   │       └── timeline.ts         CURRENT_YEAR helper
│   └── vite.config.ts              Proxies /api and /sanctum to backend in dev
│
└── docker-compose.prod.yml         pam_app (port 8900) + pam_db + pam_phpmyadmin on pam_net bridge
```

---

## Architecture decisions to know

### Single container
`pam_app` runs nginx + PHP-FPM + scheduler in one container via supervisord. This avoids inter-container networking issues on Synology DSM which reserves ports 9000 (PHP-FPM) and 3306 (MariaDB) on the host. PHP-FPM runs on **port 9001** specifically for this reason.

### Auth
Sanctum token-based (not cookie). Token stored in `localStorage`, sent as `Authorization: Bearer <token>` on every request. The `vite.config.ts` dev proxy forwards `/api` and `/sanctum` to `localhost:8000`.

### Dialog widths
The base `DialogContent` in `frontend/src/components/ui/dialog.tsx` has **no** default `sm:max-w-*` class — it was removed because Tailwind's responsive prefix has higher specificity and silently overrides per-dialog `className`. Each dialog specifies its own width (e.g. `w-[416px] max-w-none sm:max-w-none`).

### Tailwind calc()
`w-[calc(36rem-160px)]` silently fails — spaces are required: `w-[calc(36rem_-_160px)]`. Prefer fixed pixel values like `w-[416px]` to avoid this.

### Budget cache invalidation
Budget queries (`budgets-actual`, `budgets-breakdown`, `budgets-all`) must be invalidated whenever contracts, consumables, work orders, or printers are mutated. This is done in `useData.ts` in the `onSuccess` callbacks of the relevant mutations.

---

## Role system

Four roles: `super-admin`, `admin`, `reports`, `view`.

Role colours are applied throughout the sidebar (active nav pill, printer logo icon, badge):

| Role | Colour |
|---|---|
| super-admin | `#800040` (burgundy) |
| admin | `#1e40af` (blue) |
| reports | `#92400e` (amber) |
| view | `#166534` (green) |

Defined in `Sidebar.tsx` as `roleActiveStyle` and in `badge.tsx` as `role-*` variants.

Tab visibility by role is controlled by the `roles` array on each item in `allNavItems` in `Sidebar.tsx`.

---

## Key domain logic

### Budget breakdown (BudgetController::breakdown)
The Breakdown card in the Budget tab is fed by `/api/budgets/breakdown?year=YYYY`. Each OPEX row maps to:

| Row | Source |
|---|---|
| Lease Fees | `printers.monthly_fixed_cost × 12` WHERE `cost_type='OPEX'` |
| Consumables | `SUM(consumables.unit_cost × quantity)` using `COALESCE(purchase_date, created_at)` |
| Maintenance/Support/Service/Lease Contracts | `contracts.annual_cost` prorated by days active in year |
| Work Orders | `work_orders.cost` WHERE `status='completed'` AND `completed_date` in year |

Only **Printer Purchases** (CAPEX) and **Lease Contracts** (OPEX) carry a `budgeted` value. All other rows show actual spend only. Contract spend is prorated: `(annual_cost ÷ 365) × days active within the year`.

### SNMP / TopAccess
`TopAccessService` queries printers via SNMPv1/v2c using standard Printer MIB-II OIDs (RFC 3805). `getPrinters()` returns cached DB data — no live query. `fetchAllLive()` queries every printer live and writes results to `snmp_*` columns on the `printers` table. The PHP `snmp` extension must be loaded in the container.

### Email alerts
`AlertService::send()` runs every minute via the scheduler but uses a 24-hour content-hash dedup lock — it only sends when alert state changes. Triggers: out-of-stock consumables, low-stock consumables, contracts within their notice period, overdue printer service dates. Immediate stock alerts also fire when a consumable is saved, with a 1-hour per-consumable dedup.

### Print Manager email template
The email body editor is a `contentEditable` div with `ref={bodyRef}`. It only exists in the DOM when the `students` tab is active. `emailBodyHtml` state mirrors the content so `getPreview()` works even when the div isn't mounted. `savedTemplateRef` holds the template across tab switches without triggering re-renders.

---

## Deployment on Synology NAS

```bash
# Pull latest
git pull origin main

# Rebuild and restart
docker compose -f docker-compose.prod.yml up -d --build

# Run migrations (first time or after schema changes)
docker exec pam_app php artisan migrate --force
```

Container names: `pam_app`, `pam_db`, `pam_phpmyadmin`. Network: `pam_net` (bridge).

The app is available at `http://<NAS_IP>:8900`.

---

## Files that should never be committed

- `backend/.env`
- `backend/storage/app/smtp_config.json` (SMTP credentials)
- `backend/storage/app/notification_config.json`
- `backend/storage/app/snipeit_config.json` (Snipe-IT API key)
