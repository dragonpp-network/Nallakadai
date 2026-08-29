# Fresh Nalla Kadai — Web Ordering & Operations System

A specialized, bilingual (Tamil + English) pre-ordering application built for **Nalla Kadai Organic, Erode** (`fresh.nallakadai.in`). 

Built with **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS**, and **Supabase PostgreSQL**, optimized for containerized hosting on **Railway**.

---

## 🌟 Key Features

* **Passwordless Mobile Login:** Customers enter their 10-digit registered phone number (no OTP/password required). Unregistered numbers receive a direct branch WhatsApp inquiry link.
* **Unit-Confusion Guard (FR-4.5):** Strict validation preventing mistakes (e.g. typing `500` on an item sold in Kg with max 10 kg).
* **Single Scrolling Storefront:** Grouped by category with brand tints (`#EAF3DD`, `#DCEBD3`, `#FBE9D8`), Tamil + English names, 1-tap presets, and real-time cart.
* **"Same as Last Order":** One-click repeat order function that automatically filters out items unavailable in the current cycle.
* **Automated Cycle Timing:** Cycles auto-close at scheduled date-time with manual override controls (`force_open`, `force_closed`).
* **Live Admin Dashboard:** Real-time stats and **"Not Yet Ordered"** caller list with 1-tap dial links (`tel:`) and Excel export for sales follow-up.
* **Farm Harvest Aggregation:** Cumulative category-wise produce totals for partner farms with instant Excel export and printable PDF layout.
* **Batch Picking Order Sheets:** Clean A4/A5 printable packing slips with customer delivery details and Tamil typography.
* **Defaulter & Non-Collection Tracking:** Flags non-collected orders and warns staff automatically when opening the next cycle.
* **Multi-Branch Isolation:** Branch Admin accounts are strictly isolated to their branch; Super Admin manages all branches.

---

## 🚀 Quick Deployment to Railway

### 1. Set Up Supabase Database (Free Tier)
1. Create a free project at [supabase.com](https://supabase.com).
2. Go to **SQL Editor** in your Supabase dashboard.
3. Paste and run the contents of [`supabase/schema.sql`](./supabase/schema.sql).
4. Paste and run the contents of [`supabase/seed.sql`](./supabase/seed.sql).
5. Copy your **Project URL**, **anon key**, and **service_role key** from **Project Settings → API**.

### 2. Deploy to Railway
1. Push this repository to GitHub.
2. Go to [railway.com](https://railway.com) and create a **New Project → Deploy from GitHub repo**.
3. Railway will automatically detect the [`Dockerfile`](./Dockerfile) and [`railway.json`](./railway.json).
4. Add the following **Environment Variables** in Railway:
   * `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase URL (`https://xyz.supabase.co`)
   * `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon public key
   * `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
5. Under **Settings → Networking → Custom Domain**, add `fresh.nallakadai.in`.

---

## 💻 Local Development

```bash
# Install dependencies
npm install

# Set up environment variables (.env.local)
cp .env.example .env.local

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the customer storefront, or [http://localhost:3000/admin](http://localhost:3000/admin) for the admin portal.

---

## 📂 Project Structure

```
fresh-nallakadai/
├── src/
│   ├── app/
│   │   ├── (customer)/page.tsx      # Customer storefront & cart checkout
│   │   ├── admin/                   # Complete admin operations portal
│   │   │   ├── page.tsx             # Dashboard & Not Yet Ordered caller list
│   │   │   ├── cycles/              # Cycle scheduling & auto-close timers
│   │   │   ├── availability/        # Per-cycle pricing & quantity caps
│   │   │   ├── orders/              # Order list & editable modal
│   │   │   ├── farm-order/          # Farm aggregation & Excel export
│   │   │   ├── order-sheets/        # Batch A4/A5 picking slips
│   │   │   ├── customers/           # Customer master & CSV bulk import
│   │   │   ├── items/               # Master catalogue (Tamil + English)
│   │   │   ├── non-collection/      # Defaulter tracking log
│   │   │   ├── branches/            # Branch WhatsApp & contact setup
│   │   │   ├── reports/             # Analytical reports
│   │   │   └── audit/               # Audit trail
│   │   ├── api/health/route.ts      # Health check endpoint for Railway
│   │   ├── layout.tsx               # Google Fonts (Noto Sans Tamil, Rozha One)
│   │   └── globals.css              # Brand design tokens & print styles
│   ├── components/
│   │   ├── brand/BrandSplit.tsx     # Brand split illustration layout
│   │   └── ui/                      # Radix UI primitives
│   └── lib/
│       ├── actions/                 # Server actions for customer & admin
│       ├── supabase/                # Database clients & TypeScript types
│       └── validation.ts            # Strict unit confusion validation guard
├── supabase/
│   ├── schema.sql                   # Consolidated PostgreSQL schema & triggers
│   └── seed.sql                     # Categories, produce catalogue & Erode branch
├── Dockerfile                       # Multi-stage production container
└── railway.json                     # Railway deployment configuration
```
