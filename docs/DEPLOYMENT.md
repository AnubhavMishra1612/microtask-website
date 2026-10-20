# Production Deployment Guide — Microtask Earning Platform

This guide outlines the step-by-step procedures for deploying the Microtask Earning Platform to production (e.g., Vercel + Supabase).

---

## 1. Prerequisites & Services

1. **Hosting Platform**: [Vercel](https://vercel.com) (or any Node.js 18+ container platform).
2. **Database**: [Supabase](https://supabase.com) PostgreSQL database instance.
3. **Private Object Storage**: Supabase Storage private bucket (`private_task_proofs`).
4. **Domain & DNS**: Valid domain with HTTPS / SSL certificate.

---

## 2. Supabase Configuration

### A. Connection Pooler Configuration
In serverless environments (e.g. Next.js on Vercel), serverless functions scale dynamically. Connecting directly to PostgreSQL on port `5432` can quickly exhaust database connection slots.

1. In the Supabase Dashboard, navigate to **Project Settings** $\rightarrow$ **Database**.
2. Scroll to the **Connection string** section and select **Connection Pooler**.
3. Choose **Mode: Session** (Port `5432`) or **Mode: Transaction** (Port `6543`).
   - Note: The pooler username must be scoped to your project reference: `postgres.[PROJECT-REF]`.
4. Copy the connection string.
   - For Session mode (port 5432, recommended for serverless + Prisma migrations):
     ```text
     DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[ENCODED-PASSWORD]@[POOLER-HOST]:5432/postgres?connection_limit=5&pool_timeout=30&connect_timeout=30"
     ```
   - For Transaction mode (port 6543), append `?pgbouncer=true`:
     ```text
     DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[ENCODED-PASSWORD]@[POOLER-HOST]:6543/postgres?pgbouncer=true&connection_limit=5&pool_timeout=30&connect_timeout=30"
     ```
   - **Crucial**: If your database password contains special characters or spaces, URL-encode them (e.g., a leading space must be `%20`).
   - Append `connection_limit=5&pool_timeout=30&connect_timeout=30` to manage Prisma's client connection concurrency.
5. For running migrations from CLI, keep the direct connection string as `DIRECT_URL` (Port 5432).

### B. Private Storage Bucket Setup
1. In the Supabase Dashboard, go to **Storage** $\rightarrow$ **New bucket**.
2. Name the bucket `task-proofs`.
3. Set **Public bucket** to **OFF** (ensure the bucket is strictly private).
4. Do not create public read policies. Access is strictly mediated server-side using `SUPABASE_SERVICE_ROLE_KEY`.

---

## 3. Environment Variables Reference

Configure these environment variables in your hosting provider (e.g., Vercel Project Settings $\rightarrow$ Environment Variables):

| Variable | Required | Description / Example |
|---|---|---|
| `DATABASE_URL` | **Yes** | Pooled PostgreSQL connection string (`aws-0-[REGION].pooler.supabase.com:5432` or `:6543`) with `?connection_limit=5&pool_timeout=30&connect_timeout=30` |
| `NODE_ENV` | **Yes** | Set to `production` |
| `NEXT_PUBLIC_APP_URL` | **Yes** | Production domain URL (e.g., `https://your-domain.vercel.app`) |
| `STORAGE_PROVIDER` | **Yes** | Set to `supabase` (local storage is strictly forbidden in production) |
| `SUPABASE_URL` | **Yes** | Supabase project URL (`https://[PROJECT-REF].supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | Supabase `service_role` secret key (never expose to frontend) |
| `SUPABASE_STORAGE_BUCKET` | **Yes** | `task-proofs` |
| `INITIAL_ADMIN_EMAIL` | Optional | Initial admin email for seed script (`admin@yourdomain.com`) |
| `INITIAL_ADMIN_PASSWORD` | Optional | Initial admin password for seed script |
| `DEFAULT_TELEGRAM_URL` | Optional | Default Telegram channel link (`https://t.me/your_channel`) |

---

## 4. Applying Database Migrations & Initial Seed

Run database migrations from your secure local environment or deployment CI pipeline:

```bash
# 1. Apply existing safe Prisma migrations to target database
npx prisma migrate deploy

# 2. (Optional) Run idempotent initial seed script
npx prisma db seed
```
> **Note**: `prisma/seed.ts` is idempotent. It verifies whether an administrator already exists and will never overwrite existing passwords or drop existing tasks.

---

## 5. Deploying to Vercel

1. Push your repository to your private Git provider (GitHub / GitLab / Bitbucket). Ensure `.env` is **not** committed (`.gitignore` excludes it).
2. Import the project in Vercel.
3. Set **Framework Preset** to **Next.js**.
4. Configure all environment variables listed in Section 3 above.
5. In **Build and Output Settings**:
   - Build Command: `npm run build` (or `next build`)
   - Output Directory: `.next`
   - Install Command: `npm install`
6. Click **Deploy**.

---

## 6. Post-Deployment Smoke Test Checklist

Execute these verification checks immediately after deployment:

1. **Public Landing Page**:
   - Open `https://your-domain.vercel.app`.
   - Confirm active demo tasks are listed with formatted INR rewards (`₹XX.XX`).
   - Confirm floating Telegram button is visible and links to the configured channel.
2. **Public Submission Flow**:
   - Open any active task, enter name, contact info, and upload a valid screenshot proof.
   - Confirm immediate redirect to `/submissions/[ref]/confirmed`.
   - Copy the `TSK-XXXX-XXXX-XXXX-XXXX` reference token.
3. **Public Status Tracking**:
   - Open `https://your-domain.vercel.app/track/[ref]`.
   - Confirm status shows `PENDING` with no leakage of worker personal details.
4. **Admin Authentication**:
   - Open `/admin/login` and authenticate with admin credentials.
   - Confirm redirect to `/admin` dashboard and verification of real-time count cards.
5. **Review Queue & Proof Inspection**:
   - Open `/admin/submissions`.
   - Locate the test submission and click **Review**.
   - Verify the screenshot renders securely from the protected `/api/admin/proofs/[key]` route.
   - Test approval or rejection (with mandatory feedback) and confirm audit log is updated.
6. **Dynamic Telegram Settings**:
   - Open `/admin/settings`.
   - Toggle button to **Disabled** and save.
   - Verify that the floating Telegram button disappears from public pages immediately without server redeployment.
   - Toggle back to **Enabled** and confirm immediate reappearance.
7. **Logout**:
   - Click **Sign Out** in the admin header.
   - Verify cookie is destroyed and subsequent access to `/admin` redirects to `/admin/login`.

---

## 7. Backup & Disaster Recovery

- **Automated Backups**: Enable Supabase Automated Daily Backups in the Supabase Dashboard under **Project Settings** $\rightarrow$ **Backups**.
- **Point-in-Time Recovery (PITR)**: For production databases, enable Supabase PITR to allow recovery to any minute in the past 7 days.
- **Data Export**: Manual backup dumps can be generated using standard PostgreSQL utilities:
  ```bash
  pg_dump --clean --if-exists "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" > backup_$(date +%Y%m%d).sql
  ```
