# Production Deployment & Hosting Guide: LeaseTracker Pro

This step-by-step master plan details **what to host where**, the **exact order of operations**, all **environment variables**, and how to take the application from your local machine to live production in under 15 minutes.

---

## 1. Hosting Architecture Matrix

| Layer | Service / Platform | Free Tier Feasibility | What It Hosts | Why This Platform |
|---|---|---|---|---|
| **Database & Storage** | **Supabase** | 100% Free (500MB DB, 1GB Storage) | PostgreSQL database (`properties`, `leases`, `rent_records`) + S3 Storage Bucket (`lease-documents`) for agreements & tenant PDFs | Relational integrity, built-in S3 storage, automated backups, visual SQL/Table editor, connection pooling (Supavisor) |
| **Backend API** | **Cloudflare Workers** | 100% Free (100,000 req/day) | Hono REST API ([backend/](file:///home/sahil/Documents/ClientWork/lease_app_2/backend)) | Zero cold start (<15ms), globally distributed edge network across 300+ cities, ultra-low latency, DDoS protection |
| **Frontend UI** | **Vercel** | 100% Free (100GB bandwidth) | Vue 3 + Vite SPA ([frontend/](file:///home/sahil/Documents/ClientWork/lease_app_2/frontend)) | Fast global CDN, seamless GitHub CI/CD continuous deployment, automatic SSL/HTTPS, instant cache invalidation |

```
                                  ┌───────────────────────────┐
                                  │      Custom Domain        │
                                  │   (e.g., yourdomain.com)  │
                                  └─────────────┬─────────────┘
                                                │
                       ┌────────────────────────┴────────────────────────┐
                       ▼                                                 ▼
        ┌─────────────────────────────┐                   ┌─────────────────────────────┐
        │     Frontend on VERCEL      │                   │  Backend on CLOUDFLARE      │
        │    https://app.yourdomain    │                   │   https://api.yourdomain    │
        │    (Vue 3 + Vite Bundle)    │                   │   (Hono Workers Edge API)   │
        └──────────────┬──────────────┘                   └──────────────┬──────────────┘
                       │                                                 │
                       │           HTTPS REST API Calls                  │
                       └─────────────────────────────────────────────────┤
                                                                         │
                                                                         ▼
                                                          ┌─────────────────────────────┐
                                                          │     Database on SUPABASE    │
                                                          │   • PostgreSQL Database     │
                                                          │   • S3 Storage Bucket       │
                                                          └─────────────────────────────┘
```

---

## 2. Step-by-Step Deployment Roadmap

Deploy in this exact sequential order: **Step 1 (Supabase) $\to$ Step 2 (Cloudflare) $\to$ Step 3 (Vercel)**.

---

### Step 1: Set Up Database & Storage on Supabase

1. **Create Account & Project**:
   - Go to [supabase.com](https://supabase.com) and click **Start your project**.
   - Create a new project (e.g., Name: `lease-tracker-prod`, Region: choose closest to your users, e.g. `ap-south-1 Mumbai` or `ap-southeast-1 Singapore`).
   - Set a strong Database Password. Wait ~2 minutes for provisioning.

2. **Execute Schema SQL**:
   - Open the **SQL Editor** in your Supabase dashboard (left navigation icon `>_`).
   - Click **New query**.
   - Open [supabase/schema.sql](file:///home/sahil/Documents/ClientWork/lease_app_2/supabase/schema.sql) in your code editor, copy the entire file, paste into Supabase, and click **Run**.
   - *This creates the `properties`, `leases`, and `rent_records` tables, updated_at triggers, and base RLS policies.*

3. **Execute Auth & Role Schema SQL**:
   - Click **New query** in the Supabase SQL editor.
   - Open [supabase/02_auth_roles_schema.sql](file:///home/sahil/Documents/ClientWork/lease_app_2/supabase/02_auth_roles_schema.sql), paste into Supabase, and click **Run**.
   - *This sets up the `profiles` table, auto-creates profiles on user signup, links properties to landlords, links leases to tenants via email, and enforces role-based RLS policies.*

4. **Execute Annual Increment Schema SQL**:
   - Click **New query** in the Supabase SQL editor.
   - Open [supabase/03_annual_increment_schema.sql](file:///home/sahil/Documents/ClientWork/lease_app_2/supabase/03_annual_increment_schema.sql), paste into Supabase, and click **Run**.
   - *This adds `annual_increment_type` ('percent' | 'fixed') and `annual_increment_amount` to support both percentage and flat rupee rent escalations.*

5. **(Optional) Seed Sample Data**:
   - If you want immediate demo data, copy [supabase/seed.sql](file:///home/sahil/Documents/ClientWork/lease_app_2/supabase/seed.sql) into a new SQL query and click **Run**.

6. **Verify Storage Bucket**:
   - Go to **Storage** in the left menu.
   - Confirm a bucket named `lease-documents` exists. If not, click **New bucket**, name it `lease-documents`, and toggle **Public bucket: ON**.

5. **Copy Your API Credentials**:
   - Go to **Project Settings** (gear icon) $\to$ **API**.
   - Note down:
     - **Project URL** (e.g. `https://abcdefghijkl.supabase.co`)
     - **anon / public key** (starts with `eyJhbGciOi...`)
     - **service_role secret key** (starts with `eyJhbGciOi...`) *(Keep this private!)*

---

### Step 2: Deploy Backend to Cloudflare Workers

1. **Log in to Cloudflare**:
   - Create a free account at [cloudflare.com](https://cloudflare.com) if you haven't already.
   - Open your terminal and navigate to the backend folder:
     ```bash
     cd /home/sahil/Documents/ClientWork/lease_app_2/backend
     ```
   - Authenticate Wrangler CLI:
     ```bash
     npx wrangler login
     ```
     *(This opens a browser tab. Click "Allow" to authorize).*

2. **Configure `wrangler.toml`**:
   - Open [backend/wrangler.toml](file:///home/sahil/Documents/ClientWork/lease_app_2/backend/wrangler.toml).
   - Update `SUPABASE_URL` and `SUPABASE_ANON_KEY` with your credentials from Step 1:
     ```toml
     name = "lease-tracker-api"
     main = "src/index.ts"
     compatibility_date = "2024-10-01"
     compatibility_flags = ["nodejs_compat"]

     [vars]
     SUPABASE_URL = "https://your-project-id.supabase.co"
     SUPABASE_ANON_KEY = "your-actual-supabase-anon-key"
     ```

3. **Store Service Role Secret in Cloudflare**:
   - Run the following command in terminal:
     ```bash
     npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
     ```
   - When prompted, paste your Supabase `service_role` key and hit Enter.

4. **Deploy**:
   - Run the deploy command:
     ```bash
     npm run deploy
     ```
   - Wrangler will package the TypeScript code and output your live edge API URL, for example:
     ```
     Published lease-tracker-api (1.23 sec)
       https://lease-tracker-api.<your-subdomain>.workers.dev
     ```
   - **Test your live backend**:
     Open `https://lease-tracker-api.<your-subdomain>.workers.dev/api/health` in your browser.
     It should return:
     ```json
     {"status": "ok", "environment": "configured"}
     ```

---

### Step 3: Deploy Frontend to Vercel

You can deploy to Vercel using either **Method A (GitHub Integration - Recommended)** or **Method B (Vercel CLI)**.

#### Method A: Via GitHub (Continuous Deployment)
1. Initialize git and push your repository to GitHub:
   ```bash
   cd /home/sahil/Documents/ClientWork/lease_app_2
   git init
   git add .
   git commit -m "feat: initial commit of lease tracker application"
   # Create a new repository on github.com, then:
   git remote add origin https://github.com/<your-username>/lease-tracker.git
   git branch -M main
   git push -u origin main
   ```
2. Go to [vercel.com](https://vercel.com) and click **"Add New..." $\to$ "Project"**.
3. Import your GitHub repository `lease-tracker`.
4. In the Project Configuration screen:
   - **Framework Preset**: Vite (auto-detected)
   - **Root Directory**: Click *Edit* and select `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. **Environment Variables**:
   - Add the following variable:
     - **Name**: `VITE_API_URL`
     - **Value**: `https://lease-tracker-api.<your-subdomain>.workers.dev` (Your Cloudflare URL from Step 2)
6. Click **Deploy**.
   Vercel will build the Vue 3 app in ~25 seconds and assign a live URL (e.g. `https://lease-tracker-pro.vercel.app`).

#### Method B: Via Vercel CLI (Direct from Terminal)
If you don't want to use GitHub right away:
```bash
cd /home/sahil/Documents/ClientWork/lease_app_2/frontend
npx vercel
```
- Link to your Vercel account when prompted.
- Set Root directory to `./`.
- When asked to deploy to production, run:
  ```bash
  npx vercel --prod
  ```

---

## 3. Post-Launch Smoke Test Checklist

Once both URLs are live:

- [ ] **Open Frontend**: Visit `https://your-app.vercel.app`.
- [ ] **Check Status Chip**: Verify the top header shows:
  ```
  Connected: Cloudflare Edge + Supabase (Green indicator)
  ```
- [ ] **Add Property**: Click `+ Add Property`, enter "City Centre Complex", save, and verify it appears immediately in the table.
- [ ] **Add Tenant Lease**: Click `+ Add Lease`, enter tenant details, set an annual increment (e.g. 10%), attach an agreement PDF, and verify live escalation preview.
- [ ] **Generate Monthly Invoices**: Navigate to `Monthly Collection`, pick current month, click `Generate Month Invoices`, and verify invoices are created.
- [ ] **Toggle Payment**: Click `Mark Paid` on an invoice, check that status changes to `Paid`, and verify the Dashboard progress bar updates in real time.
- [ ] **Test 30-Day Alert**: Verify that any lease ending within 30 days shows up on `Upcoming Renewals` with remaining days badge.

---

## 4. Custom Domain Setup (Optional)

If you have a domain (e.g. `mypropertyapp.com`):

1. **Frontend (`app.mypropertyapp.com`)**:
   - In Vercel Project Settings $\to$ **Domains**, add `app.mypropertyapp.com`.
   - Add the CNAME record in your DNS provider pointing to `cname.vercel-dns.com`.
2. **Backend API (`api.mypropertyapp.com`)**:
   - In Cloudflare Dashboard $\to$ **Workers & Pages** $\to$ `lease-tracker-api` $\to$ **Settings** $\to$ **Domains & Routes**.
   - Click **Add Custom Domain** and enter `api.mypropertyapp.com`.
3. Update `VITE_API_URL` in Vercel to `https://api.mypropertyapp.com`.

---

## 5. Cost Summary

Everything in this architecture operates on the **free tier**:

| Service | Included Free Monthly Limits | Estimated App Usage | Cost |
|---|---|---|---|
| **Supabase** | 500 MB database, 1 GB storage, 50,000 active users | ~2 MB database, ~150 MB files | **$0.00 / month** |
| **Cloudflare Workers** | 100,000 API requests / day | ~500 - 3,000 req / day | **$0.00 / month** |
| **Vercel** | 100 GB global bandwidth, unlimited deployments | ~1 - 5 GB / month | **$0.00 / month** |
| **Total** | | | **$0.00 / month** |
