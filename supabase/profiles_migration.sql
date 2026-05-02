-- ============================================================
-- Vestry: profiles table + plan gating
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Profiles table
create table if not exists profiles (
  id                     uuid primary key references auth.users(id) on delete cascade,
  plan                   text not null default 'free',   -- 'free' | 'pro' | 'portfolio'
  is_admin               boolean not null default false,
  stripe_customer_id     text,                           -- landlord's Stripe customer (for billing)
  stripe_subscription_id text,
  created_at             timestamptz default now(),
  updated_at             timestamptz default now()
);

-- 2. RLS
alter table profiles enable row level security;

create policy "Users read own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users update own profile"
  on profiles for update
  using (auth.uid() = id);

-- Service role can do anything (needed by webhook function)
create policy "Service role full access"
  on profiles for all
  using (true)
  with check (true);

-- 3. Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- 4. updated_at trigger
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_updated_at on profiles;
create trigger profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at();

-- 5. Backfill profiles for any existing users
insert into profiles (id)
select id from auth.users
on conflict (id) do nothing;

-- 6. Set admin flag for owner account
-- (If user doesn't exist yet, this will be a no-op — profile is created at sign-up)
update profiles set is_admin = true, plan = 'portfolio'
where id in (
  select id from auth.users where email = 'aluisguerrero12@gmail.com'
);
