# Asset Tracker — Printer Asset Management

A full-stack internal web application for managing printer assets, consumables, maintenance, contracts, suppliers, and budgets. Built with **Laravel 13** (backend API) and **React + Vite + TypeScript** (frontend), deployed via **Docker**.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Local Development Setup](#local-development-setup)
- [Environment Variables](#environment-variables)
- [Running the App](#running-the-app)
- [Useful Commands](#useful-commands)
- [Production Deployment](#production-deployment)

---

## Overview

Asset Tracker gives IT and admin teams a single dashboard to track all printer assets — what they cost, where they are, when they need service, what consumables they use, and how they fit into the annual budget. It integrates with **Snipe-IT** for asset syncing and sends automated **email alerts** for low stock, out-of-stock consumables, expiring contracts, and overdue service.

---

## Features

| Tab | What it does |
|---|---|
| **Dashboard** | Fleet overview, budget progress, monthly print volume chart, critical alerts |
| **Printers** | Full CRUD for all printer assets with CAPEX/OPEX classification |
| **CAPEX** | View and manage capital expenditure printers |
| **OPEX** | View and manage operational expenditure printers with per-page cost tracking |
| **Consumables** | Inventory management, assign consumables to printers, stock alerts |
| **Maintenance** | Work orders with priority, status, scheduling, and completion tracking |
| **Contracts** | Service and lease contract management with expiry alerts |
| **Suppliers** | Supplier directory with spend tracking and ratings |
| **Budget** | Annual budget planning with CAPEX/OPEX breakdown and actual spend tracking |
| **Reports** | Export printer, consumable, and maintenance data as CSV or PDF |
| **Snipe-IT** | Sync assets from a connected Snipe-IT instance |
| **Admin** | SMTP configuration, notification settings, user management |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Recharts |
| Backend | Laravel 13, PHP 8.3+, Laravel Sanctum (auth) |
| Database | MySQL 8 |
| State / Data | TanStack Query (React Query) |
| HTTP Client | Axios |
| Email | SMTP via Gmail (or any provider), configured in Admin panel |
| Asset Sync | Snipe-IT API integration |
| Containerisation | Docker + Docker Compose |
| Web Server | Nginx |

---

## Project Structure

```
├── backend/                  Laravel API
│   ├── app/
│   │   ├── Http/Controllers/Api/   API controllers
│   │   ├── Models/                 Eloquent models
│   │   ├── Services/               AlertService, SnipeItService
│   │   └── Console/Commands/       Scheduled alert command
│   ├── database/migrations/        All database migrations
│   ├── routes/api.php              API route definitions
│   ├── Dockerfile.prod             Production Docker image
│   └── docker-compose.yml          Local dev DB + phpMyAdmin
│
├── frontend/                 React SPA
│   ├── src/
│   │   ├── pages/            One file per tab/page
│   │   ├── components/       Shared UI components
│   │   ├── hooks/useData.ts  All TanStack Query hooks
│   │   ├── services/api.ts   All Axios API calls
│   │   └── types/index.ts    TypeScript interfaces
│   └── vite.config.ts
│
├── docker-compose.prod.yml   Production Docker setup (3 containers)
├── Dockerfile.nginx          Nginx image (serves frontend + proxies API)
└── nginx.prod.conf           Nginx configuration
```

---

## Prerequisites

Make sure the following are installed on your laptop before starting:

| Tool | Minimum Version | Check |
|---|---|---|
| **PHP** | 8.3+ | `php --version` |
| **Composer** | 2.x | `composer --version` |
| **Node.js** | 18+ | `node --version` |
| **npm** | 9+ | `npm --version` |
| **MySQL** | 8.0 | `mysql --version` |
| **Git** | any | `git --version` |

> **Tip:** If you don't want to install MySQL locally, you can use the included Docker setup instead (see [Using Docker for local DB](#option-b-use-docker-for-the-database)).

---

## Local Development Setup

### 1 — Clone the repository

```bash
git clone https://github.com/MCCI-git/printer-asset-management.git
cd printer-asset-management
```

---

### 2 — Backend setup

```bash
cd backend
```

#### Install PHP dependencies
```bash
composer install
```

#### Create your environment file
```bash
cp .env.example .env
```

#### Generate the app key
```bash
php artisan key:generate
```

#### Configure your database

Open `.env` and set your database credentials:
```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=printer_assets
DB_USERNAME=root
DB_PASSWORD=your_mysql_password
```

#### Option A — Use your local MySQL

Create the database manually:
```bash
mysql -u root -p
CREATE DATABASE printer_assets;
EXIT;
```

#### Option B — Use Docker for the database

If you don't want to install MySQL, spin up the dev containers instead:
```bash
docker compose up -d
```
This starts MySQL on port `3306` and phpMyAdmin at `http://localhost:8081`.

Use these credentials in your `.env`:
```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=printer_assets
DB_USERNAME=root
DB_PASSWORD=root
```

#### Run migrations
```bash
php artisan migrate
```

#### (Optional) Seed with sample data
```bash
php artisan db:seed
```

---

### 3 — Frontend setup

Open a new terminal tab, then:

```bash
cd frontend
npm install
```

---

## Environment Variables

The only file you need to configure is `backend/.env`. Key variables:

| Variable | Description | Example |
|---|---|---|
| `APP_KEY` | Auto-generated by `php artisan key:generate` | `base64:...` |
| `APP_URL` | URL of the Laravel backend | `http://localhost:8000` |
| `FRONTEND_URL` | URL of the Vite dev server | `http://localhost:5173` |
| `DB_DATABASE` | Database name | `printer_assets` |
| `DB_USERNAME` | Database user | `root` |
| `DB_PASSWORD` | Database password | `secret` |
| `MAIL_MAILER` | Set to `log` for local dev (no real emails sent) | `log` |

> **SMTP and Snipe-IT credentials** are configured through the Admin panel inside the app — you do not need to set them in `.env`.

---

## Running the App

You need two terminals running at the same time.

**Terminal 1 — Laravel backend:**
```bash
cd backend
php artisan serve
```
API available at `http://localhost:8000`

**Terminal 2 — React frontend:**
```bash
cd frontend
npm run dev
```
App available at `http://localhost:5173`

Open `http://localhost:5173` in your browser.

---

### Default login

On first run, register an account at `http://localhost:5173/register`.

The first registered user is automatically given the `super-admin` role.

---

## Useful Commands

### Backend

| Command | What it does |
|---|---|
| `php artisan migrate` | Run pending database migrations |
| `php artisan migrate:rollback` | Roll back the last migration |
| `php artisan migrate:fresh --seed` | Wipe and recreate all tables with seed data |
| `php artisan route:list` | List all registered API routes |
| `php artisan alerts:send` | Manually trigger alert emails |
| `php artisan optimize:clear` | Clear all cached config, routes, and views |

### Frontend

| Command | What it does |
|---|---|
| `npm run dev` | Start the Vite dev server with hot reload |
| `npm run build` | Build production-ready static files to `dist/` |
| `npm run lint` | Run ESLint on the codebase |

---

## Production Deployment

For deploying to a **Synology NAS** or any Docker-capable server, see the full deployment guide in [`DEPLOYMENT_GUIDE.html`](./DEPLOYMENT_GUIDE.html).

The short version — on the server:

```bash
# First time only
git clone https://github.com/MCCI-git/printer-asset-management.git assettracker
cd assettracker
nano .env   # set APP_KEY, APP_URL, DB_PASSWORD, DB_ROOT_PASSWORD
docker compose -f docker-compose.prod.yml up -d --build
docker exec pam_backend php artisan migrate --force
```

```bash
# Every time you push new changes
bash deploy.sh
```

The production setup runs 3 Docker containers:
- `pam_nginx` — serves the React frontend and proxies API requests
- `pam_backend` — Laravel running via PHP-FPM
- `pam_db` — MySQL 8 database

The app will be available at `http://YOUR_SERVER_IP:8900`.

---

## Notes

- **Email alerts** require SMTP to be configured in Admin → SMTP Settings. Gmail works well with an App Password.
- **Snipe-IT sync** requires a running Snipe-IT instance. Configure the URL and API key in Admin → Snipe-IT Settings.
- All sensitive config (SMTP password, Snipe-IT API key) is stored in `backend/storage/app/` and is excluded from Git.
