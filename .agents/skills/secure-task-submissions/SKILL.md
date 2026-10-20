---
name: secure-task-submissions
description: Enforces secure task submissions, private proof uploads, server-side validation, database-backed authentication, independent authorization barriers, and persistent rate limiting. Use when building or modifying submission, auth, or review workflows.
---

# Secure Task Submissions Guidelines

## Authentication & Authorization
- **Database-Backed Sessions:** Manage revocable admin sessions in `AdminSession`. Set cookies with `httpOnly: true`, `secure: process.env.NODE_ENV === "production"`, `sameSite: "lax"`, and explicit expiry.
- **Independent Server-Side Enforcement:** Always invoke `requireAdmin()` inside every protected Server Action and Route Handler. Never rely solely on UI button hiding or Next.js middleware.
- **Password Security:** Use bcrypt with at least 12 salt rounds for administrative passwords. Never store or log plaintext passwords.

## Input Validation & Rate Limiting
- **Server Validation:** Validate all incoming parameters with Zod schemas. Reject invalid types, oversized strings, and negative/zero rewards.
- **Persistent Rate Limiting:** Enforce persistent rate limits via `RateLimitBucket` on sensitive routes (admin login, proof submissions) to prevent brute-force attacks and spam.
- **Reference Code Security:** Generate unpredictable tokens using high-entropy random bytes (e.g., `generateReferenceCode()`). The public tracking route (`/track/[ref]`) must expose only minimal necessary data.

## Private Storage & File Uploads
- **Storage Location:** Never place user uploads in `public/`.
- **MIME & Size Enforcement:** Strictly enforce a 5 MB maximum file size. Inspect file magic bytes (`validateImageMagicBytes()`) on the server to reject masqueraded executable files or scripts.
- **Filename Sanitization:** Always generate cryptographically safe, unique storage keys (e.g., `proof_<timestamp>_<hex>.<ext>`) and verify paths against directory traversal.
- **Environment Policy:** Production environments must use private Supabase Storage (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`). Refuse execution if production storage credentials are missing; never fall back silently to local storage in production.
