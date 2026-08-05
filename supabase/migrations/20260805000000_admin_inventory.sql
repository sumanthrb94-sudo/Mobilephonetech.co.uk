-- ═══════════════════════════════════════════════════════════════
-- Admin inventory management
--
-- Adds an admin role and the write policies the back-store UI needs.
-- Authorization is enforced by Postgres, not by the client: the browser
-- talks to Supabase with the signed-in user's JWT and RLS decides what
-- it may do. No service-role key is ever shipped to the frontend.
--
-- Idempotent — safe to run more than once.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Role on profiles ────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'customer';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_role_check'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_role_check CHECK (role IN ('customer', 'admin'));
  END IF;
END $$;

-- ── 2. is_admin() ──────────────────────────────────────────────
-- SECURITY DEFINER so the lookup bypasses RLS on `profiles`. Without it
-- the policies below would recurse: reading profiles to decide whether
-- you may read profiles. search_path is pinned so a caller cannot shadow
-- `profiles` with their own table and grant themselves admin.
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

-- ── 3. Nobody may promote themselves ───────────────────────────
-- profiles_owner_update lets a user edit their own row, which would
-- otherwise include `role`. This trigger rejects any change to role that
-- does not come from the service role (i.e. the Supabase dashboard or a
-- server-side script).
CREATE OR REPLACE FUNCTION guard_profile_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND COALESCE(current_setting('request.jwt.claims', true)::jsonb ->> 'role', '') <> 'service_role'
  THEN
    RAISE EXCEPTION 'role may only be changed by a service-role connection';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS profiles_guard_role ON profiles;
CREATE TRIGGER profiles_guard_role
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION guard_profile_role();

-- ── 4. Admin write policies ────────────────────────────────────
-- Products and variants were public-read / service-role-write. These add
-- admin write access. Public SELECT policies are left untouched.
DROP POLICY IF EXISTS "products_admin_insert" ON products;
DROP POLICY IF EXISTS "products_admin_update" ON products;
DROP POLICY IF EXISTS "products_admin_delete" ON products;

CREATE POLICY "products_admin_insert" ON products FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "products_admin_update" ON products FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "products_admin_delete" ON products FOR DELETE USING (is_admin());

DROP POLICY IF EXISTS "variants_admin_insert" ON product_variants;
DROP POLICY IF EXISTS "variants_admin_update" ON product_variants;
DROP POLICY IF EXISTS "variants_admin_delete" ON product_variants;

CREATE POLICY "variants_admin_insert" ON product_variants FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "variants_admin_update" ON product_variants FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "variants_admin_delete" ON product_variants FOR DELETE USING (is_admin());

-- Admins need to read their own profile to discover they are an admin.
-- profiles_owner_select already covers that, so nothing more is needed.

-- ── 5. Storage bucket for product imagery ──────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,  -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO UPDATE
  SET public             = EXCLUDED.public,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "product_images_public_read" ON storage.objects;
DROP POLICY IF EXISTS "product_images_admin_insert" ON storage.objects;
DROP POLICY IF EXISTS "product_images_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "product_images_admin_delete" ON storage.objects;

CREATE POLICY "product_images_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');

CREATE POLICY "product_images_admin_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'product-images' AND is_admin());

CREATE POLICY "product_images_admin_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'product-images' AND is_admin());

CREATE POLICY "product_images_admin_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'product-images' AND is_admin());

-- ── 6. Promote your first admin ────────────────────────────────
-- Run this once, in the Supabase SQL editor, with your own address.
-- It must run there (or from a service-role script) — the trigger in
-- step 3 blocks role changes made with a normal user's JWT.
--
--   UPDATE profiles SET role = 'admin'
--   WHERE id = (SELECT id FROM auth.users WHERE email = 'you@example.com');
