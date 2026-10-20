---
name: deployment
description: Manages deployment readiness, environment variable validation, production database migrations, build verification, and deployment documentation. Use when preparing releases or configuring environments.
---

# Deployment Guidelines

## Environment Variable Configuration
- **Secrets Management:** Keep all real credentials, keys, and connection strings out of version control.
- **Documentation:** Maintain [.env.example](file:///f:/student%20app/.env.example) with descriptive comments and placeholders.
- **Required Production Variables:**
  - `DATABASE_URL`: PostgreSQL connection string.
  - `NODE_ENV`: Must be set to `production`.
  - `NEXT_PUBLIC_APP_URL`: Production domain URL (e.g., `https://your-domain.vercel.app`).
  - `STORAGE_PROVIDER`: Must be set to `supabase`.
  - `SUPABASE_URL`: Supabase project URL.
  - `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role secret for private storage bucket access.
  - `SUPABASE_STORAGE_BUCKET`: Name of private storage bucket (e.g., `private_task_proofs`).
  - `INITIAL_ADMIN_EMAIL` & `INITIAL_ADMIN_PASSWORD`: Used by the seed script for bootstrap.
  - `DEFAULT_TELEGRAM_URL`: Optional validated Telegram channel/support link.

## Pre-Deployment Verification
Before pushing to production or deploying to Vercel:
1. Ensure `.env` is listed in `.gitignore` and untracked by Git.
2. Run database migration in target environment:
   ```bash
   npx prisma migrate deploy
   ```
3. Generate the Prisma client:
   ```bash
   npx prisma generate
   ```
4. Run full TypeScript static analysis:
   ```bash
   npx tsc --noEmit
   ```
5. Run the production build test:
   ```bash
   npm run build
   ```
6. Verify private bucket permissions in Supabase: ensure the bucket is marked **Private** (no public reads) and accessible only via the service role key.
