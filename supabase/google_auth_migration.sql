-- ============================================================
-- Vestry: Google OAuth support migration
-- Run this in Supabase Dashboard → SQL Editor
-- Safe to run multiple times (all statements use IF NOT EXISTS
-- or ADD COLUMN IF NOT EXISTS).
-- ============================================================

-- ── 1. Add new columns to profiles ──────────────────────────
-- email      — synced from Google (or email/password signup)
-- full_name  — from Google user_metadata.full_name / name
-- avatar_url — from Google user_metadata.avatar_url
-- role       — 'landlord' | 'tenant' | 'admin' | null (null = not yet selected)

alter table profiles
  add column if not exists email      text,
  add column if not exists full_name  text,
  add column if not exists avatar_url text,
  add column if not exists role       text;

-- ── 2. Allow authenticated users to insert their own profile ─
-- The DB trigger auto-creates profiles on auth.users insert,
-- but the /auth/callback route does an upsert from the browser,
-- which requires an INSERT policy.
-- (SELECT + UPDATE policies already exist from profiles_migration.sql)

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'profiles'
      and policyname = 'Users insert own profile'
  ) then
    execute $policy$
      create policy "Users insert own profile"
        on profiles for insert
        with check (auth.uid() = id)
    $policy$;
  end if;
end
$$;

-- ── 3. Update the auto-create trigger to also populate email ─
-- Replaces the function from profiles_migration.sql so that
-- email signups also get their email stored in profiles.

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- (The trigger itself is already created; replacing the function is enough.)

-- ── 4. Ensure master admin keeps their role/plan on backfill ─
-- Adjust the email below if you change VITE_MASTER_ADMIN_EMAIL.
-- This is a one-time backfill for the account owner.
update profiles
set
  is_admin = true,
  plan     = 'portfolio',
  role     = 'admin'
where id in (
  select id from auth.users where email = 'aluisguerrero12@gmail.com'
);

-- ── Done ────────────────────────────────────────────────────
-- After running this migration, complete the Supabase Dashboard setup:
--
-- Authentication → Providers → Google
--   • Enable Google provider
--   • Enter Client ID and Client Secret from Google Cloud Console
--
-- Authentication → URL Configuration
--   • Site URL: https://YOUR_NETLIFY_DOMAIN.netlify.app
--   • Redirect URLs (add all three):
--       http://localhost:5173/**
--       https://YOUR_NETLIFY_DOMAIN.netlify.app/**
--       https://YOUR_CUSTOM_DOMAIN.com/** (if applicable)
--
-- See GOOGLE_AUTH_SETUP.md for the full step-by-step guide.
