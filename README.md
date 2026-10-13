# LeaseTracker Pro - Commercial Property & Rent Management System

A high-performance, modern full-stack application for managing commercial properties, retail shops, tenant lease registers, compounding annual rent increments, 60-day renewal alerts, and monthly rent collections.

Engineered with:
- **Frontend**: **Vue 3** (Composition API, `<script setup>`, TypeScript, Vite, Pinia, Vue Router, Lucide Icons) – Ready for **Vercel**
- **Backend API**: **Cloudflare Workers** with **Hono** (edge serverless, <15ms cold start)
- **Database & Storage**: **Supabase** (PostgreSQL with strict relational foreign keys, compounding math, and S3-compatible agreement document storage)

---

## Architecture Overview

```
                      ┌───────────────────────────────────────┐
                      │    Client Browser (Desktop & Mobile)  │
                      └──────────────────┬────────────────────┘
                                         │
                 ┌───────────────────────┴──────────────────────┐
                 │                                              │
                 ▼                                              ▼
   ┌───────────────────────────┐                 ┌─────────────────────────────┐
   │    Frontend on Vercel     │                 │ Backend on Cloudflare Edge  │
   │  Vue 3 + Vite + Pinia     │                 │   Hono REST API (Worker)    │
   └───────────────────────────┘                 └──────────────┬──────────────┘
                                                                │
                                                                ▼
                                                 ┌─────────────────────────────┐
                                                 │       Supabase Cloud        │
                                                 │ • PostgreSQL (Properties,   │
                                                 │   Leases, Invoices)         │
                                                 │ • Storage (Agreement PDFs)  │
                                                 └─────────────────────────────┘
```

---

## Key Features

1. **Commercial Properties Master**:
   - Register shopping malls, commercial complexes, and retail centers.
   - Real-time unit capacity and active lease counters.
   - Deletion safety preventing accidental deletion of properties with active leases.

2. **Tenant & Lease Register**:
   - Tenant contact details with one-click direct telephone dial shortcut.
   - Compounding annual escalation calculation: `base_rent * (1 + increment%)^years`.
   - Automatic status calculation: `Active`, `Renewal Due` (≤ 60 days left), or `Expired`.
   - Agreement attachment uploads (PDFs, KYC documents, images).

3. **Monthly Rent Collection (Accounts Receivable)**:
   - Month-by-month billing register (`YYYY-MM`).
   - One-click batch generation of rent records for all running leases.
   - Dynamic `Overdue` detection when unpaid past due date.
   - Instant "Mark Paid" / "Undo Payment" toggles with collection progress visualization.

4. **Dedicated 60-Day Renewal Reminder Center**:
   - Live days-left countdown chips.
   - Priority renewal contact cards with direct call links and one-click contract extension modal.

5. **Multi-User Authentication & Role-Based Access Control (RBAC)**:
   - Separate experiences for **Landlords** and **Tenants**.
   - **Landlord Experience**: Full administrative control over properties, leases, annual escalations, invoice generation, and revenue charts.
   - **Tenant Self-Service Portal (`/tenant-portal`)**: Dedicated portal for tenants to view current lease details, monthly rent, compounding increment rates, payment history, download lease agreements, and view landlord emergency contact details.
   - **Automatic Tenant Linking**: When a tenant registers or logs in, leases matching their email address automatically link to their account.
   - **Zero-Friction 1-Click Demo Logins**: Test both roles instantly with the "Demo Landlord" and "Demo Tenant" buttons on the login screen.

6. **Dual-Mode (Zero-Friction Local Testing & Cloud Ready)**:
   - Includes **Instant Local Demo Mode** (pre-seeded with realistic commercial data) so anyone can launch and test the frontend immediately without setting up accounts.
   - Seamlessly toggle to **Live Cloudflare + Supabase Mode** via header badge or environment variables.

---

## Directory Structure

```
lease_app_2/
├── frontend/                     # Vue 3 Frontend
│   ├── src/
│   │   ├── api/                  # Dual-mode API Client (Live + Local Mock)
│   │   ├── assets/main.css       # Design system CSS tokens, glassmorphism, animations
│   │   ├── components/           # Sidebar, HeaderBar, StatCards, Modals, Toasts
│   │   ├── views/                # Dashboard, Properties, Leases, RentCollection, Renewals
│   │   ├── stores/               # Pinia state stores
│   │   ├── utils/                # Escalation formulas, Indian currency & date formatters
│   │   ├── router/               # Vue Router configuration
│   │   ├── App.vue
│   │   └── main.ts
│   ├── vercel.json               # Vercel SPA deployment configuration
│   ├── vite.config.ts
│   └── package.json
│
├── backend/                      # Cloudflare Workers API
│   ├── src/
│   │   ├── routes/               # Properties, Leases, Rents, Dashboard, Renewals
│   │   ├── utils/leaseCalc.ts    # Server-side compounding rent & status utilities
│   │   ├── db/supabase.ts        # Supabase client wrapper
│   │   └── index.ts              # Hono application entry point
│   ├── wrangler.toml             # Cloudflare Workers configuration
│   └── package.json
│
├── supabase/
│   ├── schema.sql                # Complete PostgreSQL schema, foreign keys, triggers, RLS
│   └── seed.sql                  # Realistic commercial sample data
│
└── lease_tracking_software (1).html # Preserved baseline single-file prototype
```

---

## Setup & Deployment Guide

### 1. Database Setup (Supabase)

1. Create a free project at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase dashboard.
3. Open `supabase/schema.sql` and run the entire script. This creates:
   - `properties`, `leases`, and `rent_records` tables with strict constraints.
   - Automatic `updated_at` triggers.
   - `lease-documents` storage bucket.
   - Row-Level Security policies.
4. (Optional) Run `supabase/seed.sql` to populate sample properties, active leases, and rent records.
5. Retrieve your project credentials from **Project Settings → API**:
   - `Project URL` (e.g. `https://xyz.supabase.co`)
   - `anon public key`
   - `service_role secret key`

---

### 2. Backend Deployment (Cloudflare Workers)

1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   npm install
   ```
2. Configure `wrangler.toml` with your Supabase URL and Anon Key:
   ```toml
   [vars]
   SUPABASE_URL = "https://your-project.supabase.co"
   SUPABASE_ANON_KEY = "your-supabase-anon-key"
   ```
3. Set your service role secret (recommended for backend workers):
   ```bash
   npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
   ```
4. Test locally:
   ```bash
   npm run dev
   # Server runs at http://localhost:8787
   ```
5. Deploy to Cloudflare Workers:
   ```bash
   npm run deploy
   # Deploys globally to Cloudflare Edge (e.g. https://lease-tracker-api.your-subdomain.workers.dev)
   ```

---

### 3. Frontend Deployment (Vercel)

1. Navigate to the `frontend/` directory:
   ```bash
   cd frontend
   npm install
   ```
2. Test locally:
   ```bash
   npm run dev
   # Vite dev server runs at http://localhost:5173
   ```
3. For deployment to **Vercel**:
   - Push your repository to GitHub.
   - In Vercel, click **"Add New Project"** and import this repository.
   - Set **Root Directory** to `frontend`.
   - Vercel automatically detects Vite.
   - (Optional) Set environment variable:
     - `VITE_API_URL`: Your deployed Cloudflare Worker URL (e.g., `https://lease-tracker-api.your-subdomain.workers.dev`).
   - Click **Deploy**.

---

## Compounding Rent Escalation Formula

Rent escalation compounds per completed year from the lease start date:

$$\text{Current Rent} = \text{Base Rent} \times \left(1 + \frac{\text{Increment \%}}{100}\right)^{\text{Completed Years}}$$

*Example*:
- Base Rent: ₹35,000 / month
- Annual Escalation: 10%
- Start Date: 01-Jan-2024
- Target Date: Oct 2026 (2 full completed lease years)
- Current Rent: $35,000 \times (1.10)^2 = ₹42,350.00$
