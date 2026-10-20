---
name: secure-task-submissions
description: Implements secure task submissions, private proof uploads, database operations, and admin review workflows. Use when handling submissions, uploads, authentication, or approval actions.
---

# Secure Task Submissions

- Validate every input on the server.
- Enforce authorization in every protected operation.
- Keep proof files private and validate file type and size.
- Never expose secrets or private user data.
- Apply persistent rate limiting to sensitive endpoints.
- Prevent duplicate and conflicting review actions.
- Use database transactions where appropriate.
- Record approval and rejection decisions in an audit log.
- Test unauthorized access and invalid submissions.
