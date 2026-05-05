-- ============================================================
-- Vestry: Admin panel migration
-- Run in Supabase → SQL Editor
-- ============================================================

-- ── 1. Add is_active column to profiles ─────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- ── 2. Update the new-user trigger to auto-grant admin ──────
-- When the master admin email signs up, they immediately get
-- is_admin = true and portfolio plan — no manual SQL needed.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  v_is_admin := new.email IN (
    'luis.guerrero4711@gmail.com',
    'aluisguerrero12@gmail.com'
  );

  INSERT INTO public.profiles (id, email, is_admin, plan, role)
  VALUES (
    new.id,
    new.email,
    v_is_admin,
    CASE WHEN v_is_admin THEN 'portfolio' ELSE 'free' END,
    CASE WHEN v_is_admin THEN 'admin' ELSE NULL END
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 3. Backfill admin status for owner accounts ──────────────
UPDATE profiles
SET is_admin = TRUE, plan = 'portfolio', role = 'admin'
WHERE id IN (
  SELECT id FROM auth.users
  WHERE email IN ('luis.guerrero4711@gmail.com', 'aluisguerrero12@gmail.com')
);

-- ── 4. RPC: get all profiles (admin only) ───────────────────
-- Called from the Admin page. Runs SECURITY DEFINER so it can
-- bypass RLS, but checks is_admin internally.
CREATE OR REPLACE FUNCTION get_all_profiles_for_admin()
RETURNS TABLE (
  id           UUID,
  email        TEXT,
  full_name    TEXT,
  avatar_url   TEXT,
  plan         TEXT,
  is_admin     BOOLEAN,
  role         TEXT,
  is_active    BOOLEAN,
  created_at   TIMESTAMPTZ,
  property_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Gate: only admins may call this
  IF NOT COALESCE(
    (SELECT p.is_admin FROM profiles p WHERE p.id = auth.uid() LIMIT 1),
    FALSE
  ) THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.email,
    p.full_name,
    p.avatar_url,
    p.plan,
    p.is_admin,
    p.role,
    p.is_active,
    p.created_at,
    COUNT(pr.id) AS property_count
  FROM profiles p
  LEFT JOIN properties pr ON pr.user_id = p.id
  GROUP BY p.id, p.email, p.full_name, p.avatar_url,
           p.plan, p.is_admin, p.role, p.is_active, p.created_at
  ORDER BY p.created_at ASC;
END;
$$;

-- ── 5. Allow admins to update any profile row ────────────────
-- (for activate/deactivate, role change)
DROP POLICY IF EXISTS "Users update own profile" ON profiles;
CREATE POLICY "Users update own profile"
  ON profiles FOR UPDATE
  USING (
    auth.uid() = id
    OR COALESCE(
      (SELECT p.is_admin FROM profiles p WHERE p.id = auth.uid() LIMIT 1),
      FALSE
    )
  )
  WITH CHECK (
    auth.uid() = id
    OR COALESCE(
      (SELECT p.is_admin FROM profiles p WHERE p.id = auth.uid() LIMIT 1),
      FALSE
    )
  );

-- ── Done ─────────────────────────────────────────────────────
-- After running this:
--   1. Set VITE_MASTER_ADMIN_EMAIL=luis.guerrero4711@gmail.com in Netlify
--   2. Sign up at /auth with luis.guerrero4711@gmail.com — you'll be admin instantly
--   3. Visit /admin to manage all users
