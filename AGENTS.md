# AGENTS.md — Development Rules for Microtask Platform

## 1. Incremental Delivery & Milestones
- Implement only one milestone at a time. Never attempt multi-milestone rewrites in a single pass.
- Run tests (`npm run test`), TypeScript static checks (`npx tsc --noEmit`), and build checks (`npm run build`) after each milestone.
- Fix all detected issues before moving to the next milestone.

## 2. Minimal Token & Resource Usage
- Keep instructions, logs, and edits focused and concise.
- Use targeted search and surgical edits rather than rewriting whole files.
- Inspect the codebase before making changes to avoid duplicate logic or unused boilerplate.

## 3. Strict Security & Data Privacy
- Never store secrets or sensitive credentials in Git or frontend bundles.
- Enforce independent authorization checks (`requireAdmin()`) in every protected Server Action and Route Handler.
- Never place user upload files in `public/`. Enforce server-side file magic byte sniffing and the 5 MB limit.
- Support local private storage for development only; enforce Supabase private storage in production.
- Use cryptographically unpredictable reference tokens (`TSK-XXXX-XXXX-XXXX-XXXX`) for task tracking.

## 4. Database Integrity
- Use PostgreSQL `Decimal(10, 2)` for all monetary reward amounts and submission snapshots.
- Use safe Prisma migrations; never run destructive resets against existing data.
- Enforce mandatory rejection reasons (min 5 chars) and log all administrative decisions in `SubmissionReviewLog`.

## 5. Scope & Tech Stack Discipline
- Do not add unrequested features (no user accounts, wallets, payment gateways, referrals, or business accounts).
- Do not introduce redundant third-party libraries. Reuse the existing stack (Next.js 14 App Router, TypeScript, Tailwind CSS, Prisma, Zod, bcryptjs, Vitest).
- Clearly label demo tasks in seed data (`[DEMO] ...`).

## 6. Verification Before Completion
- Never claim a feature is complete without running verification commands.
- Verify mobile responsiveness, accessibility, error states, and empty states.
