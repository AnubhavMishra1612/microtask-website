-- ==============================================================================
-- Migration: Enable Row Level Security (RLS) on all Public Schema Tables
-- ==============================================================================
-- Resolution for Supabase Security Advisor: "RLS Disabled in Public"
-- All 8 flagged public tables are protected with Row Level Security.
--
-- Access Model:
-- Microtask India accesses PostgreSQL exclusively via trusted server-side Prisma ORM
-- connections using the 'postgres' role (which has BYPASSRLS privilege).
-- Direct PostgREST client API access via 'anon' and 'authenticated' roles is denied
-- by default, preventing unauthorized public access to sensitive credentials, sessions,
-- user submission proofs, audit logs, and internal migration metadata.
-- ==============================================================================

-- 1. Enable Row Level Security on all 8 flagged tables
ALTER TABLE "public"."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."AdminUser" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."AdminSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Task" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."TaskSubmission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."SubmissionReviewLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."SiteSetting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."RateLimitBucket" ENABLE ROW LEVEL SECURITY;

-- 2. Revoke public API privileges from untrusted PostgREST roles (anon, authenticated)
-- By default in Supabase, anon/authenticated have excessive table grants in public schema.
REVOKE ALL ON TABLE "public"."_prisma_migrations" FROM anon, authenticated;
REVOKE ALL ON TABLE "public"."AdminUser" FROM anon, authenticated;
REVOKE ALL ON TABLE "public"."AdminSession" FROM anon, authenticated;
REVOKE ALL ON TABLE "public"."Task" FROM anon, authenticated;
REVOKE ALL ON TABLE "public"."TaskSubmission" FROM anon, authenticated;
REVOKE ALL ON TABLE "public"."SubmissionReviewLog" FROM anon, authenticated;
REVOKE ALL ON TABLE "public"."SiteSetting" FROM anon, authenticated;
REVOKE ALL ON TABLE "public"."RateLimitBucket" FROM anon, authenticated;
