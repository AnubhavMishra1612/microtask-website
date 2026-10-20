# Production Security Checklist — Microtask Earning Platform

## 1. Authentication & Session Architecture
- [x] **Database-Backed Sessions:** Sessions are stored in the PostgreSQL `AdminSession` table and cryptographically generated with 32 bytes of secure random entropy (`generateSessionToken()`).
- [x] **Secure Cookies:** Admin session tokens are stored in `admin_session_token` with `httpOnly: true`, `sameSite: "lax"`, and `secure: true` in production environments.
- [x] **Explicit Revocation:** Logging out invalidates the session record in the database immediately and deletes the cookie. Expired sessions are purged during lookup.
- [x] **Timing-Safe Password Verification:** Admin credentials use `bcryptjs` with cost factor 12 to mitigate timing and brute-force attacks.
- [x] **Independent Authorization:** Middleware acts solely as an Edge boundary; every protected Server Action and Route Handler independently verifies `requireAdmin()`.

## 2. Private Proof Uploads & Storage Protection
- [x] **No Public File Exposure:** User uploads are never placed in Next.js `public/` directory or served statically.
- [x] **Strict Server-Side Magic Byte Sniffing:** Buffers are inspected for valid JPEG (`FF D8 FF`), PNG (`89 50 4E 47`), and WEBP (`RIFF ... WEBP`) signatures. Client-supplied MIME types and file extensions are never trusted.
- [x] **5 MB File Size Limit:** Enforced before and during file buffer ingestion.
- [x] **Safe Entropy Filenames:** Uploaded files are assigned random filenames (`proof_${timestamp}_${hexId}.${ext}`) to eliminate path traversal and collisions.
- [x] **Storage Environment Rule:** Production strictly forbids local filesystem storage and throws `CONFIG_ERROR` if `STORAGE_PROVIDER=local` is detected in `NODE_ENV=production`.
- [x] **IDOR-Protected Streaming Route:** Private proofs are served exclusively via `/api/admin/proofs/[key]`, which requires admin authentication, verifies regex safety, and checks database ownership against `TaskSubmission`.

## 3. Worker Privacy & Reference Token Security
- [x] **Cryptographically Unpredictable Tokens:** Submission tracking codes follow `TSK-XXXX-XXXX-XXXX-XXXX` generated with crypto random bytes.
- [x] **Zero PII Exposure on Public Routes:** The `/track/[ref]` endpoint queries only `status`, `rejectionReason`, `rewardSnapshot`, `submittedAt`, and `reviewedAt`. Submitter contact info, real names, and proof image keys are excluded from public JSON payloads.
- [x] **Anti-Enumeration:** Looking up invalid or non-existent reference tokens returns a uniform generic empty state without exposing database metadata.

## 4. Concurrency Safety & Audit Integrity
- [x] **Atomic Transactions:** Review decisions (status update + audit log creation) execute inside an atomic `prisma.$transaction`.
- [x] **Race-Condition Protection:** Status transitions from `PENDING` to `APPROVED` or `REJECTED` utilize a conditional `updateMany` guard (`where: { id, status: "PENDING" }`). Simultaneous reviews by multiple administrators detect conflicts and prevent conflicting overwrites.
- [x] **Immutable Audit Trail:** Decisions and rejection reasons are permanently captured in `SubmissionReviewLog` with acting administrator details and timestamps.

## 5. Input Validation & Injection Prevention
- [x] **Server-Side Zod Schemas:** All forms and actions validate inputs using Zod schemas on the server side.
- [x] **PostgreSQL Decimal Money Fields:** All rewards and reward snapshots use PostgreSQL `Decimal(10, 2)` to eliminate floating-point precision errors.
- [x] **Telegram URL Validation:** Accepts only valid HTTPS Telegram URLs (`t.me` and `telegram.me`). Rejects `javascript:`, `data:`, plain HTTP, and arbitrary domains.
- [x] **Parameterized Queries:** Prisma ORM ensures parameterized queries across all database operations, preventing SQL injection.

## 6. Distributed Rate Limiting
- [x] **Persistent Database Bucket:** `RateLimitBucket` enforces rate limits across multi-instance serverless deployments (unlike in-memory maps).
- [x] **Login Rate Limit:** 5 attempts per 15 minutes per IP address.
- [x] **Submission Rate Limit:** 5 submissions per 10 minutes per IP address.

## 7. HTTP Headers & Transport Security
- [x] **Clickjacking Mitigation:** `X-Frame-Options: DENY` configured in `next.config.mjs`.
- [x] **MIME Sniffing Prevention:** `X-Content-Type-Options: nosniff`.
- [x] **Referrer Control:** `Referrer-Policy: strict-origin-when-cross-origin`.
- [x] **Feature Policies:** `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
- [x] **Information Disclosure:** `poweredByHeader: false` suppresses the `X-Powered-By: Next.js` header.
