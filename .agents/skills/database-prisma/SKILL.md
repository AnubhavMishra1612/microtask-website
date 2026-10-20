---
name: database-prisma
description: Guides PostgreSQL and Prisma ORM data modeling, migrations, Decimal currency precision, database transactions, indexes, and relationship constraints. Use when modifying schema, running migrations, or executing queries.
---

# Database & Prisma Guidelines

## Schema Design & Precision
- **Currency Fields:** Always store rewards and snapshots using PostgreSQL `Decimal(10, 2)`. Never use floating-point types (`Float` or `Double`) to avoid precision loss.
- **Normalized Models:**
  - `AdminUser`: Email, bcrypt password hash, name.
  - `AdminSession`: Database-backed revocable sessions (`sessionToken`, `expiresAt`, index on `expiresAt`).
  - `Task`: Status enum (`DRAFT`, `ACTIVE`, `PAUSED`, `CLOSED`, `EXPIRED`), reward, deadline, proof requirements.
  - `TaskSubmission`: `rewardSnapshot` (Decimal) captured at submission time, unpredictable `referenceCode` (unique index), status enum (`PENDING`, `APPROVED`, `REJECTED`).
  - `SubmissionReviewLog`: Immutable audit trail for every approval or rejection decision.
  - `RateLimitBucket`: Persistent rate limiting table (`key`, `count`, `resetAt`).
  - `SiteSetting`: Unique key-value table for site-wide configuration.

## Safe Migrations & Operations
- Never run destructive commands (`prisma migrate reset` or `prisma db push --force-reset`) against existing environments.
- Use `prisma migrate dev` for local schema migrations and `prisma migrate deploy` for production.
- Always add database indexes on foreign keys, status filters, and search columns (`referenceCode`, `status`, `taskId`, `resetAt`).

## Transactions & Concurrency
- Use `prisma.$transaction()` for state transitions that modify submissions and create audit logs simultaneously.
- Verify existing submission status before updating to prevent duplicate review actions or race conditions.
- Enforce relational integrity using foreign key constraints (`onDelete: Restrict` on critical relations like Task -> Submissions).
