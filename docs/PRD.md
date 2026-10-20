# Product Requirements Document (PRD) — Microtask Earning Platform

## 1. Product Overview

The Microtask Earning Platform is a lightweight, secure, and mobile-first web application designed for users in India to browse simple online tasks, follow step-by-step instructions, submit completion proofs (screenshots and text), and track their review status.

Administrators manage task lifecycles, review incoming proofs securely, and approve or reject submissions with mandatory feedback.

---

## 2. Target Users & Personas

1. **Microtask Worker (Submitter in India):**
   - Accesses the platform primarily via mobile smartphones on 4G/5G connections.
   - Browses active tasks offering clear monetary rewards in Indian Rupees (INR `₹`).
   - Completes tasks and uploads proof without needing an account or complex onboarding.
   - Monitors review progress using a secure, unpredictable tracking reference.
   - Can join community updates or reach support via a floating Telegram button.

2. **Platform Administrator:**
   - Authenticates through a protected administrative dashboard.
   - Creates, edits, publishes, pauses, and closes tasks.
   - Reviews submitted proofs privately, ensuring submission integrity.
   - Approves valid submissions or rejects invalid ones with specific, mandatory feedback.
   - Configures site settings, including community Telegram URLs.

---

## 3. Core User Flows

### 3.1 Public Worker Flow
1. **Browse:** Visitor lands on the Home Page (`/`) and browses active, eligible microtasks with rewards clearly displayed in INR (`₹`).
2. **Details:** Visitor opens a task (`/tasks/[id]`) to read detailed instructions, deadlines, and proof requirements.
3. **Submit:** Visitor completes the task and navigates to the submission form (`/tasks/[id]/submit`).
4. **Validation & Upload:** Submitter enters their name, contact details (Telegram/Phone/Email/UPI ID), optional or required proof text, and uploads a screenshot. The file is validated on client and server (magic bytes, max 5 MB).
5. **Confirmation:** Upon successful submission, a cryptographically unpredictable reference token (e.g. `TSK-XXXX-XXXX-XXXX-XXXX`) is generated. The visitor lands on `/submissions/[ref]/confirmed` with a direct tracking link and copy action.
6. **Tracking:** The submitter checks review status anytime at `/track/[ref]` (canonical route) or via reference search at `/track`.

### 3.2 Administrator Review Flow
1. **Authentication:** Admin logs in at `/admin/login` protected by persistent rate limiting, database-backed revocable sessions, and HTTP-only cookies.
2. **Dashboard Overview:** Admin views key metrics: total submissions, pending reviews, active tasks, and approved rewards.
3. **Task Management:** Admin creates new tasks, edits existing tasks, and toggles statuses (`ACTIVE`, `PAUSED`, `CLOSED`, `DRAFT`).
4. **Submission Review:** Admin opens the review queue (`/admin/submissions`), filters by status, inspects proof text, and previews uploaded screenshot proofs via short-lived authorized access.
5. **Decision & Audit:** Admin approves or rejects the submission. For rejections, a specific reason (min 5 characters) is mandatory. The decision is recorded in an immutable audit log (`SubmissionReviewLog`).

---

## 4. Detailed Functional Requirements

### 4.1 Public Pages & Features
- **Home Page (`/`):**
  - Displays hero banner, active task cards, task search, and category/reward filters.
  - Cards show title, reward in INR (`₹`), proof type badge (Screenshot, Text, or Both), and deadline countdown.
  - Zero fake statistics, fake counters, or fabricated activity feeds.
- **Task Details (`/tasks/[id]`):**
  - Full task description, numbered instruction steps, reward amount, proof checklist, and expiration status.
  - Obvious call-to-action button to submit proof (disabled if task is paused, closed, or expired).
- **Task Submission Form (`/tasks/[id]/submit`):**
  - Accessible, mobile-friendly form with client-side and server-side validation.
  - Drag-and-drop file uploader supporting JPEG, PNG, and WebP (max 5 MB).
  - Rate limiting enforced to prevent submission spam.
- **Submission Confirmation (`/submissions/[ref]/confirmed`):**
  - Displays formatted reference token (`TSK-XXXX-XXXX-XXXX-XXXX`).
  - Copy reference button and direct link to the canonical tracking page.
  - Warning reminding the submitter to save the tracking code.
- **Canonical Tracking Page (`/track/[ref]`):**
  - Displays submission status badge (`PENDING`, `APPROVED`, `REJECTED`).
  - Minimal necessary information exposed: Task Title, Reward Snapshot (`₹`), Submission Timestamp, and Admin Rejection Reason (if rejected).
  - Never leaks sensitive personal info, phone numbers, or private storage paths.
  - General lookup page at `/track` allows entering a reference code manually.
- **Floating Telegram Widget:**
  - Present on all public pages in the bottom right corner.
  - Opens configured Telegram channel or support chat in a new tab.
  - Gracefully renders a disabled or subtle state if no Telegram URL is configured.

### 4.2 Administrator Dashboard
- **Admin Authentication (`/admin/login`):**
  - Email and password login.
  - Password hashed with bcrypt (salt rounds = 12).
  - Database-backed revocable session records (`AdminSession`).
  - Secure, HTTP-only, `SameSite=Lax` cookie.
  - Rate limiting on login attempts to thwart brute force.
  - Session expiry and explicit logout button that invalidates the session in the database.
- **Dashboard Overview (`/admin`):**
  - Key operational cards:
    - `Active Tasks`
    - `Pending Reviews`
    - `Approved Submissions`
    - `Rejected Submissions`
    - `Approved Rewards` (labeled precisely as rewards approved, not proof of payment).
- **Task Management (`/admin/tasks`):**
  - Listing table with search, status filters, and action dropdowns.
  - Create Task form with validation for title, description, instructions, Decimal reward in INR, proof requirements, deadline, and max submissions.
  - Edit Task modal/page.
  - One-click status toggles: Publish (`ACTIVE`), Pause (`PAUSED`), Close (`CLOSED`).
- **Submission Review Queue (`/admin/submissions`):**
  - Filterable by status (`PENDING`, `APPROVED`, `REJECTED`) and searchable by reference code or task title.
  - Detailed review modal: submitter name, contact information, submission date, reward snapshot, proof text, and proof image preview.
  - Authorized, short-lived proof image endpoint preventing public file access.
  - **Approve Action:** Atomically transitions status to `APPROVED`, records review timestamp and admin ID, and logs to `SubmissionReviewLog`.
  - **Reject Action:** Requires a mandatory rejection reason (min 5 characters) explaining what was deficient, transitions status to `REJECTED`, and logs to `SubmissionReviewLog`.
- **Audit Log (`/admin/audit-logs`):**
  - Chronological history of administrative review decisions (action, admin email, submission reference, reason, timestamp).
- **Site Settings (`/admin/settings`):**
  - Configure public Telegram channel/support URL with validation.
  - General site configuration.

---

## 5. Non-Functional & Security Requirements

1. **Monetary Precision:**
   - All task rewards and submission reward snapshots are stored using PostgreSQL `Decimal(10, 2)`.
   - Never use floating-point arithmetic for currency.
2. **File Privacy & Upload Security:**
   - Files are stored outside the public directory.
   - Client and server enforce a strict 5 MB file size limit.
   - Server inspects file magic bytes (JPEG `FF D8 FF`, PNG `89 50 4E 47`, WEBP `RIFF...WEBP`), never trusting user-provided MIME headers alone.
   - Safe, cryptographically random filenames are generated (`proof_<timestamp>_<hex>.<ext>`).
   - Production strictly requires Supabase Storage configuration (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`). Local storage is permitted in development only and will throw a configuration error if used in production.
3. **Independent Authorization:**
   - Every protected server action and route handler independently verifies the admin session against the database.
   - Middleware provides route protection as a defense-in-depth layer, not the sole security gate.
4. **Persistent Rate Limiting:**
   - Rate limiting is persisted in the PostgreSQL database via `RateLimitBucket`.
   - Protects submission creation and admin login across serverless/multi-node deployments.
5. **Mobile-First Responsive Design:**
   - Tailored for mobile devices, tablets, and desktop displays.
   - Touch-friendly targets (minimum 44x44px), clean typography, high-contrast readable elements, and fast loading.

---

## 6. Project Scope & Explicit Non-Goals (V1)

The following features are **explicitly out of scope** for V1 to maintain low operating costs, simplicity, and rapid production readiness:
- User registration and worker accounts.
- Digital wallets and internal worker balances.
- Automated payment gateway integrations (Razorpay, Paytm, Cashfree, Stripe).
- Automated payouts or UPI auto-disbursements.
- Referral programs and bonus schemes.
- Business/advertiser self-serve accounts.
