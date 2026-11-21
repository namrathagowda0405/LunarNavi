# LunarNavi — Supabase Database Setup & Configuration Guide

This guide walks you through provisioning, configuring, and verifying the **Supabase** backend for LunarNavi.

---

## 1. Quick Overview & Offline Guarantee

> [!NOTE]
> **Supabase is completely optional for local development and demos.**
> LunarNavi is designed with a resilient hybrid architecture:
> - **With Supabase**: Enables cloud persistence, synchronized landing site datasets, custom mission profiles, and historical decision session logging.
> - **Without Supabase**: The application transparently falls back to bundled, verified NASA datasets (`src/data/centralizedSites.ts`) and in-memory session logging with **zero runtime errors and full feature availability**.

---

## 2. Step-by-Step Setup Instructions

### Step 1: Create a Supabase Project

1. Log in to [Supabase Dashboard](https://supabase.com/dashboard).
2. Click **"New Project"**.
3. Select your organization and provide:
   - **Name**: `LunarNavi` (or preferred name)
   - **Database Password**: Choose a strong password and save it securely.
   - **Region**: Select the region closest to your users.
4. Click **"Create new project"** and wait approximately 1–2 minutes for the database cluster to initialize.

---

### Step 2: Run the Relational Database Migration

1. In your Supabase Project dashboard, open the **SQL Editor** from the left navigation bar (icon `>_`).
2. Click **"New query"**.
3. Open the migration file from your local repository:
   [`supabase/migrations/20261122000000_create_lunarnavi_schema.sql`](file:///supabase/migrations/20261122000000_create_lunarnavi_schema.sql)
4. Paste the entire SQL script into the query editor.
5. Click **"Run"** (or press `Ctrl+Enter` / `Cmd+Enter`).
6. Confirm that the query succeeds with the message `"Success. No rows returned"`.

This creates:
- `sources` table
- `criteria_definitions` table
- `missions` table
- `lunar_sites` table
- `analysis_runs` table
- Performance indexes
- Row Level Security (RLS) policies

---

### Step 3: Seed the Scientific Reference Datasets

1. In the Supabase **SQL Editor**, open another new query tab.
2. Open the seed file from your local repository:
   [`supabase/seed.sql`](file:///supabase/seed.sql)
3. Paste the entire seed script into the editor.
4. Click **"Run"**.
5. Confirm that the query executes successfully.

This populates:
- **6 Authoritative NASA Scientific Sources** (LOLA GDR, PGDA 90, PGDA 69, Artemis SDR, Diviner, LEND).
- **6 Standard Evaluation Criteria Definitions** (Slope, Roughness, Illumination, Resource Proxy, Earth Communication, Scientific Value).
- **4 Official Artemis Mission Profiles** (Science, Resource Exploration, Crewed Base, Communication).
- **16 Curated Lunar South Pole Candidate Sites** with authentic coordinates, elevations, and measurements.

---

### Step 4: Configure Local Environment Variables

1. In your local repository root, copy the `.env.example` file to create `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Navigate to your Supabase project dashboard:
   - Click **Project Settings** (gear icon at the bottom of the left sidebar).
   - Select **API** under Configuration.
3. Copy your project credentials:
   - **Project URL** (e.g. `https://xyzprojectref.supabase.co`)
   - **Project API Keys** -> `anon` / `public` key
4. Open `.env.local` in your editor and configure the keys:
   ```env
   # Supabase Cloud Database Configuration
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-public-anon-key-here
   ```

> [!CAUTION]
> Never put the `service_role` key into `.env.local` or client-side code! Only configure the `anon` public key. The `anon` key is safely restricted by Row Level Security policies.

---

### Step 5: Verify the Connection

1. Run the automated test suite:
   ```bash
   npm test -- --run
   ```
2. Start the local development server:
   ```bash
   npm run dev
   ```
3. Open your browser to `http://localhost:5173/` (or the indicated port).
4. Navigate to **Results**:
   - The analysis run will automatically be logged to your Supabase `analysis_runs` table.
5. In the Supabase Dashboard, open **Table Editor** -> `analysis_runs` to verify your new record with full TOPSIS scores and Monte Carlo metrics!

---

## 3. Alternative: Setup via Supabase CLI

If you prefer using the Supabase CLI:

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Link to your Supabase project
supabase link --project-ref your-project-ref

# Apply migrations
supabase db push

# Seed data
supabase db reset # (or execute seed.sql directly via psql)
```

---

## 4. Troubleshooting & Verification Checklist

| Symptom | Cause | Solution |
|---|---|---|
| App runs normally but no rows in `analysis_runs` | `VITE_SUPABASE_URL` missing or invalid | Ensure `.env.local` exists and contains valid `https://` URL and anon key; restart Vite server. |
| `permission denied for table analysis_runs` | RLS policy not applied | Re-run `20261122000000_create_lunarnavi_schema.sql` in SQL Editor to re-apply RLS policies. |
| TypeScript errors on database columns | Outdated schema types | Verify `src/types/database.types.ts` matches the SQL table columns. |
| Network offline error | Disconnected environment | None needed! LunarNavi automatically operates in offline fallback mode. |
