-- ============================================================
-- VESTRY — Supabase Schema
-- Run this in your Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ────────────────────────────────────────────────────────────
-- PROPERTIES
-- ────────────────────────────────────────────────────────────
create table if not exists properties (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references auth.users(id) on delete cascade not null,
  name          text not null,
  address       text not null,
  city          text,
  state         text,
  zip           text,
  type          text default 'single_family',
  -- single_family | multi_family | condo | townhouse | commercial
  units_count   int default 1,
  photo_url     text,
  notes         text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ────────────────────────────────────────────────────────────
-- UNITS  (one row per rentable unit within a property)
-- ────────────────────────────────────────────────────────────
create table if not exists units (
  id            uuid primary key default uuid_generate_v4(),
  property_id   uuid references properties(id) on delete cascade not null,
  unit_number   text not null default '1',
  bedrooms      int,
  bathrooms     numeric(3,1),
  sqft          int,
  rent_amount   numeric(10,2),
  notes         text,
  created_at    timestamptz default now()
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
  status                  text default 'active',
  -- active | past | prospect
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
  -- Supabase Storage path
  status           text default 'active',
  -- active | expired | terminated
  notes            text,
  created_at       timestamptz default now()
);

-- ────────────────────────────────────────────────────────────
-- RENT PAYMENTS  (manual log — no Stripe for MVP)
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
  payment_method text,
  -- cash | check | venmo | zelle | bank_transfer | other
  status         text default 'due',
  -- paid | due | overdue | partial
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
  category    text not null,
  -- maintenance | insurance | taxes | utilities | management | mortgage | other
  description text not null,
  amount      numeric(10,2) not null,
  date        date not null,
  vendor      text,
  receipt_url text,
  notes       text,
  created_at  timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- Every table is locked to the authenticated user's own rows.
-- ============================================================

-- properties
alter table properties enable row level security;
create policy "properties: owner full access"
  on properties for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- units
alter table units enable row level security;
create policy "units: owner via property"
  on units for all
  using (
    exists (
      select 1 from properties p
      where p.id = units.property_id and p.user_id = auth.uid()
    )
  );

-- tenants
alter table tenants enable row level security;
create policy "tenants: owner full access"
  on tenants for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- leases
alter table leases enable row level security;
create policy "leases: owner full access"
  on leases for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- rent_payments
alter table rent_payments enable row level security;
create policy "rent_payments: owner full access"
  on rent_payments for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- expenses
alter table expenses enable row level security;
create policy "expenses: owner full access"
  on expenses for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- STORAGE BUCKET  (run after creating the bucket in the UI)
-- Supabase Dashboard → Storage → New bucket → "vestry-leases"
-- Then run:
-- ============================================================
-- insert into storage.buckets (id, name, public)
--   values ('vestry-leases', 'vestry-leases', false);
--
-- create policy "lease pdfs: owner access"
--   on storage.objects for all
--   using (auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================
-- HELPFUL VIEWS
-- ============================================================

-- Portfolio summary per property (used by Reports page)
create or replace view property_summary as
select
  p.id,
  p.user_id,
  p.name,
  p.address,
  p.city,
  p.state,
  p.units_count,
  coalesce(
    (select sum(rp.amount) from rent_payments rp
     where rp.property_id = p.id
       and rp.status = 'paid'
       and date_trunc('month', rp.paid_date) = date_trunc('month', current_date)),
    0
  ) as collected_this_month,
  coalesce(
    (select sum(e.amount) from expenses e
     where e.property_id = p.id
       and date_trunc('month', e.date) = date_trunc('month', current_date)),
    0
  ) as expenses_this_month,
  (select count(*) from tenants t where t.property_id = p.id and t.status = 'active') as active_tenants
from properties p;
