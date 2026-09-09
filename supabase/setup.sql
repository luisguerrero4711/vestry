-- ============================================================
-- VESTRY — Full database setup (single script)
-- ============================================================
-- Run this ONCE in a fresh Supabase project:
--   Dashboard → SQL Editor → New query → paste all → Run
--
-- Safe to re-run: every statement is idempotent (IF NOT EXISTS,
-- CREATE OR REPLACE, DROP ... IF EXISTS before CREATE).
--
-- This replaces the old split files (schema.sql, profiles_migration.sql,
-- google_auth_migration.sql, admin_migration.sql) — it is the four of
-- them reconciled in dependency order, with these fixes:
--   • removed a "USING (true)" policy on profiles that let any logged-in
--     user read/write every other user's profile row
--   • property_summary view now runs with security_invoker (respects RLS)
--   • the "admins can see every profile" check runs through a SECURITY
--     DEFINER function (is_platform_admin) instead of a sub-select on
--     profiles from inside a profiles policy — the latter throws
--     "42P17: infinite recursion detected in policy for relation profiles"
--     and breaks every authenticated read of profiles.
-- ============================================================

-- Accounts that should get platform-admin access automatically on sign-up.
-- Edit this list, then also set VITE_MASTER_ADMIN_EMAIL in Netlify to whichever
-- one you actually sign in with.
--   → 'aluisguerrero12@gmail.com', 'luis.guerrero4711@gmail.com'

create extension if not exists "uuid-ossp";

-- ────────────────────────────────────────────────────────────
-- PROFILES  (1 row per auth user; created by trigger on sign-up)
-- ────────────────────────────────────────────────────────────
create table if not exists profiles (
  id                     uuid primary key references auth.users(id) on delete cascade,
  plan                   text    not null default 'free',   -- free | pro | portfolio
  is_admin               boolean not null default false,     -- platform operator (you / support)
  is_active              boolean not null default true,      -- admin can deactivate an account
  role                   text,                               -- landlord | tenant | admin | null(=not chosen)
  email                  text,
  full_name              text,
  avatar_url             text,
  stripe_customer_id     text,
  stripe_subscription_id text,
  created_at             timestamptz default now(),
  updated_at             timestamptz default now()
);

-- If profiles already existed from a partial run, make sure every column is present.
alter table profiles add column if not exists plan                   text    not null default 'free';
alter table profiles add column if not exists is_admin               boolean not null default false;
alter table profiles add column if not exists is_active              boolean not null default true;
alter table profiles add column if not exists role                   text;
alter table profiles add column if not exists email                  text;
alter table profiles add column if not exists full_name              text;
alter table profiles add column if not exists avatar_url             text;
alter table profiles add column if not exists stripe_customer_id     text;
alter table profiles add column if not exists stripe_subscription_id text;
alter table profiles add column if not exists created_at             timestamptz default now();
alter table profiles add column if not exists updated_at             timestamptz default now();

-- ────────────────────────────────────────────────────────────
-- PROPERTIES
-- ────────────────────────────────────────────────────────────
create table if not exists properties (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  name        text not null,
  address     text not null,
  city        text,
  state       text,
  zip         text,
  type        text default 'single_family',  -- single_family | duplex | multi_family | condo | townhome | apartment | commercial
  units_count int  default 1,
  photo_url   text,
  notes       text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ────────────────────────────────────────────────────────────
-- UNITS
-- ────────────────────────────────────────────────────────────
create table if not exists units (
  id          uuid primary key default uuid_generate_v4(),
  property_id uuid references properties(id) on delete cascade not null,
  unit_number text not null default '1',
  bedrooms    int,
  bathrooms   numeric(3,1),
  sqft        int,
  rent_amount numeric(10,2),
  notes       text,
  created_at  timestamptz default now()
);

-- ────────────────────────────────────────────────────────────
-- TENANTS
-- ────────────────────────────────────────────────────────────
create table if not exists tenants (
  id                      uuid primary key default uuid_generate_v4(),
  user_id                 uuid references auth.users(id) on delete cascade not null,
  property_id             uuid references properties(id) on delete set null,
  unit_id                 uuid references units(id) on delete set null,
  first_name              text not null,
  last_name               text not null,
  email                   text,
  phone                   text,
  move_in_date            date,
  move_out_date           date,
  emergency_contact_name  text,
  emergency_contact_phone text,
  notes                   text,
  status                  text default 'active',  -- active | past | prospect
  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);

-- ────────────────────────────────────────────────────────────
-- LEASES
-- ────────────────────────────────────────────────────────────
create table if not exists leases (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid references auth.users(id) on delete cascade not null,
  tenant_id        uuid references tenants(id) on delete cascade not null,
  property_id      uuid references properties(id) on delete cascade not null,
  unit_id          uuid references units(id) on delete set null,
  start_date       date not null,
  end_date         date,
  monthly_rent     numeric(10,2) not null,
  security_deposit numeric(10,2),
  pdf_url          text,
  status           text default 'active',  -- active | expired | terminated
  notes            text,
  created_at       timestamptz default now()
);

-- ────────────────────────────────────────────────────────────
-- RENT PAYMENTS  (manual log)
-- ────────────────────────────────────────────────────────────
create table if not exists rent_payments (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid references auth.users(id) on delete cascade not null,
  lease_id       uuid references leases(id) on delete set null,
  tenant_id      uuid references tenants(id) on delete set null,
  property_id    uuid references properties(id) on delete cascade not null,
  unit_id        uuid references units(id) on delete set null,
  amount         numeric(10,2) not null,
  due_date       date not null,
  paid_date      date,
  payment_method text,                   -- cash | check | venmo | zelle | bank_transfer | other
  status         text default 'due',     -- paid | due | overdue | partial
  notes          text,
  created_at     timestamptz default now()
);

-- ────────────────────────────────────────────────────────────
-- EXPENSES
-- ────────────────────────────────────────────────────────────
create table if not exists expenses (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  property_id uuid references properties(id) on delete cascade not null,
  unit_id     uuid references units(id) on delete set null,
  category    text not null,             -- maintenance | insurance | taxes | utilities | management | mortgage | other
  description text not null,
  amount      numeric(10,2) not null,
  date        date not null,
  vendor      text,
  receipt_url text,
  notes       text,
  created_at  timestamptz default now()
);

-- ============================================================
-- updated_at helper
-- ============================================================
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

-- ============================================================
-- New-user trigger: auto-create profile, auto-grant admin to owners
-- ============================================================
create or replace function handle_new_user()
returns trigger as $$
declare
  v_is_admin boolean;
begin
  v_is_admin := new.email in (
    'aluisguerrero12@gmail.com',
    'luis.guerrero4711@gmail.com'
  );

  insert into public.profiles (id, email, is_admin, plan, role)
  values (
    new.id,
    new.email,
    v_is_admin,
    case when v_is_admin then 'portfolio' else 'free' end,
    case when v_is_admin then 'admin'     else null   end
  )
  on conflict (id) do nothing;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- ADMIN CHECK  (SECURITY DEFINER → bypasses RLS, so it is safe to
-- call from inside a policy ON profiles without infinite recursion)
-- ============================================================
create or replace function public.is_platform_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false);
$$;

revoke all on function public.is_platform_admin() from public;
grant execute on function public.is_platform_admin() to anon, authenticated, service_role;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- ── profiles ────────────────────────────────────────────────
alter table profiles enable row level security;

drop policy if exists "Users read own profile"       on profiles;
drop policy if exists "Users update own profile"      on profiles;
drop policy if exists "Users insert own profile"      on profiles;
drop policy if exists "Service role full access"      on profiles;  -- old insecure policy, remove
drop policy if exists "Admins read all profiles"      on profiles;
drop policy if exists "Admins update any profile"     on profiles;

create policy "Users read own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users insert own profile"
  on profiles for insert
  with check (auth.uid() = id);

create policy "Users update own profile"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Platform admins can see and edit every profile (for the /admin panel).
-- Uses is_platform_admin() (SECURITY DEFINER) — a bare sub-select on
-- profiles here would recurse (42P17) and break all authenticated reads.
create policy "Admins read all profiles"
  on profiles for select
  using (public.is_platform_admin());

create policy "Admins update any profile"
  on profiles for update
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- (No policy for the service_role key — it bypasses RLS by design, which is
--  what the Stripe webhook / admin-stats Netlify functions rely on.)

-- ── domain tables: each user owns their own rows ────────────
alter table properties    enable row level security;
alter table units         enable row level security;
alter table tenants       enable row level security;
alter table leases        enable row level security;
alter table rent_payments enable row level security;
alter table expenses      enable row level security;

drop policy if exists "properties: owner full access"   on properties;
create policy "properties: owner full access"
  on properties for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "units: owner via property"       on units;
create policy "units: owner via property"
  on units for all
  using (exists (select 1 from properties p where p.id = units.property_id and p.user_id = auth.uid()))
  with check (exists (select 1 from properties p where p.id = units.property_id and p.user_id = auth.uid()));

drop policy if exists "tenants: owner full access"      on tenants;
create policy "tenants: owner full access"
  on tenants for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "leases: owner full access"       on leases;
create policy "leases: owner full access"
  on leases for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "rent_payments: owner full access" on rent_payments;
create policy "rent_payments: owner full access"
  on rent_payments for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "expenses: owner full access"     on expenses;
create policy "expenses: owner full access"
  on expenses for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- ADMIN RPC: list every profile with property count (admin-gated)
-- ============================================================
create or replace function get_all_profiles_for_admin()
returns table (
  id             uuid,
  email          text,
  full_name      text,
  avatar_url     text,
  plan           text,
  is_admin       boolean,
  role           text,
  is_active      boolean,
  created_at     timestamptz,
  property_count bigint
)
language plpgsql
security definer
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Access denied: admin only';
  end if;

  return query
  select p.id, p.email, p.full_name, p.avatar_url, p.plan, p.is_admin,
         p.role, p.is_active, p.created_at,
         count(pr.id) as property_count
  from profiles p
  left join properties pr on pr.user_id = p.id
  group by p.id
  order by p.created_at asc;
end;
$$;

-- ============================================================
-- REPORTS VIEW: per-property monthly rollup
-- security_invoker = true → the view respects the caller's RLS,
-- so a user only ever sees their own properties through it.
-- ============================================================
create or replace view property_summary
with (security_invoker = true) as
select
  p.id, p.user_id, p.name, p.address, p.city, p.state, p.units_count,
  coalesce((select sum(rp.amount) from rent_payments rp
            where rp.property_id = p.id and rp.status = 'paid'
              and date_trunc('month', rp.paid_date) = date_trunc('month', current_date)), 0) as collected_this_month,
  coalesce((select sum(e.amount) from expenses e
            where e.property_id = p.id
              and date_trunc('month', e.date) = date_trunc('month', current_date)), 0) as expenses_this_month,
  (select count(*) from tenants t where t.property_id = p.id and t.status = 'active') as active_tenants
from properties p;

-- ============================================================
-- STORAGE: private bucket for lease PDFs
-- ============================================================
insert into storage.buckets (id, name, public)
values ('vestry-leases', 'vestry-leases', false)
on conflict (id) do nothing;

drop policy if exists "lease pdfs: owner access" on storage.objects;
create policy "lease pdfs: owner access"
  on storage.objects for all
  using (bucket_id = 'vestry-leases' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'vestry-leases' and auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================
-- BACKFILL (safe if there are no users yet)
-- ============================================================
insert into profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;

update profiles
set is_admin = true, plan = 'portfolio', role = 'admin'
where id in (
  select id from auth.users
  where email in ('aluisguerrero12@gmail.com', 'luis.guerrero4711@gmail.com')
);

-- ============================================================
-- INFRA BUILD-OUT ADDITIONS  (append-only; every statement idempotent)
-- Adds: rooms table + RLS, tenant→room link, future-proof room_id FKs,
-- real properties.market_value, Phase-2 tenant auth bridge column,
-- the 5 Stripe columns the Netlify functions already write, and a
-- richer property_summary view. Safe to re-run.
-- ============================================================

-- ---------- rooms + hierarchy ----------------------
create table if not exists rooms (
  id           uuid primary key default uuid_generate_v4(),
  unit_id      uuid references units(id) on delete cascade not null,
  name         text not null default 'Room',
  monthly_rent numeric(10,2),          -- nullable: room-level rent is future
  size_sqft    int,
  notes        text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
create index if not exists rooms_unit_id_idx on rooms(unit_id);

alter table rooms enable row level security;
drop policy if exists "rooms: owner via property" on rooms;
create policy "rooms: owner via property"
  on rooms for all
  using (exists (
    select 1 from units u
    join properties p on p.id = u.property_id
    where u.id = rooms.unit_id and p.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from units u
    join properties p on p.id = u.property_id
    where u.id = rooms.unit_id and p.user_id = auth.uid()
  ));

drop trigger if exists rooms_updated_at on rooms;
create trigger rooms_updated_at
  before update on rooms
  for each row execute function update_updated_at();

-- tenant -> unit (exists) + tenant -> room (new)
alter table tenants add column if not exists room_id uuid references rooms(id) on delete set null;
create index if not exists tenants_unit_id_idx     on tenants(unit_id);
create index if not exists tenants_room_id_idx     on tenants(room_id);
create index if not exists tenants_property_id_idx on tenants(property_id);

-- future-proofing: nullable room_id on leases / payments (UI stays unit-level)
alter table leases        add column if not exists room_id uuid references rooms(id) on delete set null;
alter table rent_payments add column if not exists room_id uuid references rooms(id) on delete set null;
create index if not exists leases_unit_id_idx            on leases(unit_id);
create index if not exists leases_property_id_idx        on leases(property_id);
create index if not exists rent_payments_lease_id_idx    on rent_payments(lease_id);
create index if not exists rent_payments_property_id_idx on rent_payments(property_id);
create index if not exists rent_payments_due_date_idx    on rent_payments(due_date);
create index if not exists units_property_id_idx         on units(property_id);

-- real column replacing phantom properties.market_value
alter table properties add column if not exists market_value numeric(14,2);

-- Phase 2 tenant-portal bridge: COLUMN ONLY, no RLS / no app logic yet
alter table tenants add column if not exists auth_user_id uuid references auth.users(id) on delete set null;

-- ---------- Stripe columns the Netlify functions already write ----------
alter table tenants       add column if not exists stripe_customer_id        text;
alter table rent_payments add column if not exists payment_link             text;
alter table rent_payments add column if not exists stripe_payment_intent_id text;
alter table leases        add column if not exists reminder_days            int default 3;
alter table leases        add column if not exists stripe_subscription_id   text;

-- ---------- richer property_summary (drop first: column set changes) ----------
drop view if exists property_summary;
create view property_summary
with (security_invoker = true) as
select
  p.id, p.user_id, p.name, p.address, p.city, p.state, p.units_count,
  p.market_value,
  (select count(*) from units u where u.property_id = p.id)                                   as total_units,
  (select count(distinct l.unit_id) from leases l
     where l.property_id = p.id and l.status = 'active' and l.unit_id is not null)            as occupied_units,
  (select coalesce(sum(coalesce(l.monthly_rent, 0)), 0) from leases l
     where l.property_id = p.id and l.status = 'active')                                      as scheduled_rent,
  (select count(*) from rooms r join units u on u.id = r.unit_id where u.property_id = p.id)  as total_rooms,
  coalesce((select sum(rp.amount) from rent_payments rp
            where rp.property_id = p.id and rp.status = 'paid'
              and date_trunc('month', rp.paid_date) = date_trunc('month', current_date)), 0)  as collected_this_month,
  coalesce((select sum(e.amount) from expenses e
            where e.property_id = p.id
              and date_trunc('month', e.date) = date_trunc('month', current_date)), 0)        as expenses_this_month,
  (select count(*) from tenants t where t.property_id = p.id and t.status = 'active')         as active_tenants
from properties p;

-- ============================================================
-- LEDGER & LAUNCH-HARDENING ADDITIONS
-- Append-only, idempotent, additive. Nothing here drops or rewrites
-- existing data. Mirrors the launch-spec money rules (exact cents,
-- one charge per period, traceable reversals, deposits separate) and
-- server-side occupancy-conflict rejection. Safe to re-run.
-- ============================================================

-- ── money in exact integer cents, alongside the existing numeric column ──
alter table rent_payments add column if not exists amount_cents bigint;
update rent_payments
  set amount_cents = round(amount * 100)::bigint
  where amount_cents is null and amount is not null;

-- ── charge classification + money lifecycle ──
alter table rent_payments add column if not exists type            text default 'rent';
  -- rent | deposit | fee | credit | opening_balance
alter table rent_payments add column if not exists state           text;
  -- recorded | processing | settled | failed | reversed  (money lifecycle; `status` stays the period-coverage view)
alter table rent_payments add column if not exists period          date;
  -- first of the month a generated rent charge covers
alter table rent_payments add column if not exists payer_tenant_id uuid references tenants(id) on delete set null;

-- exactly one generated rent charge per lease per period
create unique index if not exists rent_payments_lease_period_uniq
  on rent_payments (lease_id, period, type)
  where lease_id is not null and period is not null;

-- ── payment audit trail: posted money records are never silently deleted ──
create table if not exists payment_events (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references auth.users(id) on delete set null,   -- null for system/webhook events
  rent_payment_id uuid references rent_payments(id) on delete set null,
  lease_id        uuid references leases(id) on delete set null,
  kind            text not null,           -- recorded | adjusted | reversed | refunded | note
  amount_cents    bigint,
  reason          text,
  created_at      timestamptz default now()
);
create index if not exists payment_events_payment_idx on payment_events(rent_payment_id);
create index if not exists payment_events_lease_idx   on payment_events(lease_id);
alter table payment_events enable row level security;
-- visible to whoever owns the underlying payment (or the event's own user_id)
drop policy if exists "payment_events: owner full access" on payment_events;
drop policy if exists "payment_events: via payment owner" on payment_events;
create policy "payment_events: via payment owner"
  on payment_events for all
  using (
    auth.uid() = user_id
    or exists (select 1 from rent_payments rp where rp.id = payment_events.rent_payment_id and rp.user_id = auth.uid())
  )
  with check (
    auth.uid() = user_id
    or exists (select 1 from rent_payments rp where rp.id = payment_events.rent_payment_id and rp.user_id = auth.uid())
  );

-- ── opening balances on a lease ──
alter table leases add column if not exists opening_balance_cents bigint default 0;
alter table leases add column if not exists opening_balance_date  date;

-- ── lease-end reminder schedule: default 60 and 30 days before end date ──
alter table leases add column if not exists end_reminder_days int[] default '{60,30}';
create table if not exists reminder_sends (
  id          uuid primary key default uuid_generate_v4(),
  lease_id    uuid references leases(id) on delete cascade not null,
  kind        text not null,               -- rent_due | lease_end
  key         text not null,               -- e.g. '2026-11-01' or 'end-60'
  sent_at     timestamptz default now(),
  unique (lease_id, kind, key)
);

-- ── occupancy-conflict rejection (server-side, trigger — safe on existing data) ──
create or replace function check_unit_occupancy()
returns trigger as $$
begin
  if new.status = 'active' and new.unit_id is not null then
    if exists (
      select 1 from leases l
      where l.unit_id = new.unit_id
        and l.status = 'active'
        and l.id <> new.id
    ) then
      raise exception 'Unit % already has an active lease', new.unit_id
        using errcode = 'unique_violation';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists leases_unit_occupancy on leases;
create trigger leases_unit_occupancy
  before insert or update on leases
  for each row execute function check_unit_occupancy();

-- ── maintenance requests (landlord-facing at launch; tenant intake is Phase 2) ──
create table if not exists maintenance_requests (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  property_id  uuid references properties(id) on delete cascade not null,
  unit_id      uuid references units(id) on delete set null,
  room_id      uuid references rooms(id) on delete set null,
  tenant_id    uuid references tenants(id) on delete set null,
  title        text not null,
  description  text,
  status       text default 'new',      -- new | acknowledged | in_progress | waiting | resolved
  priority     text default 'normal',   -- low | normal | high | urgent
  vendor       text,
  cost_cents   bigint,
  photos       text[],
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
create index if not exists mr_property_idx on maintenance_requests(property_id);
create index if not exists mr_status_idx   on maintenance_requests(status);
alter table maintenance_requests enable row level security;
drop policy if exists "maintenance_requests: owner full access" on maintenance_requests;
create policy "maintenance_requests: owner full access"
  on maintenance_requests for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop trigger if exists mr_updated_at on maintenance_requests;
create trigger mr_updated_at before update on maintenance_requests
  for each row execute function update_updated_at();

create table if not exists maintenance_comments (
  id          uuid primary key default uuid_generate_v4(),
  request_id  uuid references maintenance_requests(id) on delete cascade not null,
  user_id     uuid references auth.users(id) on delete set null,
  body        text not null,
  internal    boolean default false,    -- landlord-only note vs tenant-visible update
  created_at  timestamptz default now()
);
create index if not exists mc_request_idx on maintenance_comments(request_id);
alter table maintenance_comments enable row level security;
drop policy if exists "maintenance_comments: via request owner" on maintenance_comments;
create policy "maintenance_comments: via request owner"
  on maintenance_comments for all
  using (exists (select 1 from maintenance_requests r where r.id = maintenance_comments.request_id and r.user_id = auth.uid()))
  with check (exists (select 1 from maintenance_requests r where r.id = maintenance_comments.request_id and r.user_id = auth.uid()));

-- ============================================================
-- DONE. Next: Dashboard → Authentication → Providers → Google
-- (enable + paste Client ID/Secret), then Authentication → URL
-- Configuration → add redirect URLs:
--   http://localhost:5173/**
--   https://vestry-app.netlify.app/**
-- ============================================================
