---
name: testing-debugging
description: Executes targeted testing, strict TypeScript validation, linting, root-cause debugging, and milestone verification. Use after implementing features, fixing bugs, or before completing milestones.
---

# Testing & Debugging Guidelines

## Verification Checklist
Before declaring any task or milestone complete, run the following verification steps:
1. **Automated Unit & Integration Tests:** Run `npm run test` (Vitest) to verify business logic, security guards, reference tokens, and schema constraints.
2. **Strict TypeScript Checks:** Run `npx tsc --noEmit` to verify type safety without errors.
3. **Production Build Validation:** Run `npm run build` to ensure all routes, components, and page bundles compile cleanly.
4. **Linting:** Run `npm run lint` to enforce formatting and import standards.

## Targeted Test Scenarios
- **Authentication & Sessions:** Verify login failure on invalid credentials, session creation, session invalidation on logout, and rejection of expired sessions.
- **Independent Authorization:** Verify that protected server actions reject requests lacking valid admin sessions.
- **Upload Security:** Verify rejection of files exceeding 5 MB, files with fake MIME types (magic byte inspection), and path traversal attempts.
- **Submission Rules:** Verify that submissions to paused, closed, or expired tasks are rejected.
- **Audit Enforcement:** Verify that rejections without reasons fail validation, and successful reviews write an immutable log to `SubmissionReviewLog`.
- **Concurrent Review Protection:** Verify database transaction behavior when multiple review actions target the same submission.

## Root-Cause Debugging Principles
- When a test fails or an error occurs, inspect the root cause before editing code.
- Avoid trial-and-error changes; check stack traces, schema types, and environment variable states.
- Never suppress type errors with `any` or `@ts-ignore` unless interacting with untyped third-party legacy APIs.
