-- ==============================================================================
-- Supabase Storage & RLS Setup for Microtask Platform
-- ==============================================================================
-- Run this script in the Supabase SQL Editor if creating a new project
-- or migrating an existing Supabase instance.
-- ==============================================================================

-- 1. Create Private Storage Bucket for Task Proofs (5 MB file size limit, images only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'task-proofs',
  'task-proofs',
  false,
  5242880, -- 5 MB (5 * 1024 * 1024)
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- 2. Storage Bucket Access Policies
-- Note: All proof uploads and downloads are strictly mediated server-side
-- via SUPABASE_SERVICE_ROLE_KEY. The service_role bypasses RLS automatically.
-- The bucket is strictly private: anonymous and authenticated client-side
-- users cannot read, insert, update, or delete objects directly.

-- Ensure RLS is enabled on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Deny all public access to the task-proofs bucket by default
-- (Only service_role key can access objects in task-proofs)
DROP POLICY IF EXISTS "Deny direct public access to task-proofs" ON storage.objects;
CREATE POLICY "Deny direct public access to task-proofs"
ON storage.objects
FOR ALL
TO anon, authenticated
USING (bucket_id <> 'task-proofs')
WITH CHECK (bucket_id <> 'task-proofs');

-- ==============================================================================
-- Database Tables Row Level Security (RLS) Advisory Policies
-- ==============================================================================
-- Prisma ORM connects directly to Postgres via DATABASE_URL (superuser role)
-- which bypasses RLS. To prevent data leakage via Supabase PostgREST API
-- (if anon key is used externally), enable RLS on application tables:

ALTER TABLE IF EXISTS "public"."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."AdminUser" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."AdminSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."Task" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."TaskSubmission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."SubmissionReviewLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."SiteSetting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."RateLimitBucket" ENABLE ROW LEVEL SECURITY;

-- Allow public read of active tasks via PostgREST (if needed)
DROP POLICY IF EXISTS "Allow anon read active tasks" ON "public"."Task";
CREATE POLICY "Allow anon read active tasks"
ON "public"."Task"
FOR SELECT
TO anon, authenticated
USING (status = 'ACTIVE');

-- Allow public read of public site settings
DROP POLICY IF EXISTS "Allow anon read site settings" ON "public"."SiteSetting";
CREATE POLICY "Allow anon read site settings"
ON "public"."SiteSetting"
FOR SELECT
TO anon, authenticated
USING (true);
