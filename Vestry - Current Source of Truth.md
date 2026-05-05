# Vestry — Current Source of Truth
_Last updated: May 2026_

---

## What Is Vestry
Property management SaaS for small landlords (1–20 units). Competes on clean UX against free tools like TurboTenant. Paid plans unlock premium features. MVP is in active development.

**Live URL:** Deployed on Netlify via GitHub auto-deploy (main branch → build triggers automatically).  
**GitHub repo:** `https://github.com/luisguerrero4711/vestry`  
**Owner:** Luis Guerrero · aluisguerrero12@gmail.com

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | React 18 + Vite |
| Auth + DB | Supabase |
| Hosting | Netlify (auto-deploy from GitHub main) |
| Payments | Stripe (wired, not fully active) |
| Email | Resend (wired, not fully active) |
| Icons | lucide-react + custom VIcon SVGs |
| Fonts | Geist + Geist Mono (Google Fonts) |

**Key dependencies in package.json:**
- `@supabase/supabase-js` ^2.43.0
- `lucide-react` ^1.14.0
- `react-router-dom` ^6.23.1
- `stripe` ^14.25.0
- `resend` ^3.2.0

---

## Repository Structure

```
vestry/
├── index.html                  ← Loads Geist font from Google Fonts
├── vite.config.js
├── package.json
├── netlify.toml
├── supabase/
│   ├── schema.sql              ← Full DB schema (run once in Supabase SQL editor)
│   └── profiles_migration.sql
└── src/
    ├── App.jsx                 ← Routes: /auth /dashboard /properties /tenants
    │                             /payments /leases /expenses /reports /pricing
    │                             /admin /settings
    ├── main.jsx
    ├── styles/
    │   └── globals.css         ← ALL design tokens + responsive CSS utilities
    ├── lib/
    │   ├── vestry-shared.jsx   ← VT tokens, VIcon (25 icons), VPill, VAvatar,
    │   │                         VSection, PropertyThumb
    │   ├── demoData.js         ← demoProperties, demoTenants; isDemoUser()
    │   └── supabase.js         ← Supabase client
    ├── hooks/
    │   ├── useAuth.jsx         ← Auth context + signOut
    │   └── usePlan.js          ← Plan gating (free/pro/portfolio)
    ├── components/
    │   ├── Layout.jsx          ← App shell: sidebar + hamburger + main content
    │   ├── Sidebar.jsx         ← Nav: Main / Finance / Account sections
    │   ├── AddPropertyModal.jsx  ← CRUD modal → Supabase insert
    │   ├── AddTenantModal.jsx    ← CRUD modal → Supabase insert
    │   ├── RecordPaymentModal.jsx ← CRUD modal → Supabase insert
    │   ├── KpiCard.jsx
    │   └── StatusPill.jsx
    └── pages/
        ├── Auth.jsx
        ├── Dashboard.jsx       ← Stat cards + sparklines + donut + net income chart
        ├── Properties.jsx      ← Property cards grid + Add property button (modal)
        ├── Tenants.jsx         ← Table view + Add tenant button (modal)
        ├── Payments.jsx        ← Hero card + chart + transaction table + Record payment
        ├── Leases.jsx          ← List + detail panel side-by-side
        ├── Expenses.jsx
        ├── Reports.jsx
        ├── Pricing.jsx
        ├── Admin.jsx
        └── Settings.jsx        ← Change email + change password via supabase.auth.updateUser()
```

---

## Design System

### Philosophy
Apple/iOS-inspired. Clean, modern, not dated. Geist font. oklch color tokens.

### CSS Custom Properties (`globals.css` `:root`)
```css
/* Surfaces */
--bg-page:    oklch(0.985 0.003 250);   /* page background */
--bg-elev-1:  oklch(1 0 0);             /* card surface */
--bg-tint:    oklch(0.96 0.005 250);    /* subtle tint */

/* Brand — iOS blue */
--brand:         oklch(0.62 0.18 255);
--brand-tint:    oklch(0.96 0.04 255);
--brand-pressed: oklch(0.55 0.18 255);

/* Status */
--green: oklch(0.68 0.15 155);  --green-tint: oklch(0.95 0.05 155);
--amber: oklch(0.78 0.15 75);   --amber-tint: oklch(0.97 0.05 75);
--red:   oklch(0.62 0.2 25);    --red-tint:   oklch(0.96 0.04 25);
```

### Responsive CSS Utilities
```css
.v-page          /* page wrapper — padding, overflow, bg */
.v-grid-4        /* 4-col → 2-col (1024px) */
.v-chart-row     /* 1fr 300px → 1-col (1024px) */
.v-hero-row      /* 1fr 1fr → 1-col (860px) */
.v-detail-row    /* 1fr 360px → 1-col (860px) */
.v-mb-{n}        /* margin-bottom utilities */
```

### Shared Component Library (`src/lib/vestry-shared.jsx`)
- **`VT`** — JS object of all CSS variable references (`VT.brand`, `VT.card`, `VT.text1`, etc.)
- **`VIcon`** — 25 custom SVG icons: House, Person, Doc, Dollar, Chart, Search, Bell, Plus, Chevron, ChevronLeft, Up, Settings, Phone, Mail, MapPin, Calendar, Filter, Download, More, Check, Sparkle, Bed, Bath, Sqft, X, Lock, User
- **`VPill({ children, tone })`** — status pill; tones: `neutral | success | warn | danger | brand`
- **`VAvatar({ initials, size, color })`** — colored circle avatar
- **`VSection({ title, subtitle, action, children })`** — card with header + body
- **`PropertyThumb({ kind, label })`** — SVG property illustrations (duplex / condo / townhome)

---

## Database Schema (Supabase)

All tables have `user_id uuid` FK → `auth.users(id) ON DELETE CASCADE`. RLS enabled.

| Table | Key columns |
|-------|------------|
| `properties` | id, user_id, name, address, city, state, **type** (not property_type), **units_count** (not units), photo_url |
| `units` | id, property_id, unit_number, bedrooms, bathrooms, sqft, rent_amount |
| `tenants` | id, user_id, property_id, **first_name**, **last_name** (not `name`), email, phone, move_in_date, **status: active\|past\|prospect** |
| `leases` | id, user_id, tenant_id (FK), property_id (FK), start_date, end_date, monthly_rent, security_deposit, pdf_url |
| **`rent_payments`** | id, user_id, tenant_id (FK), property_id (FK), amount, **due_date**, **paid_date**, payment_method, **status: paid\|due\|overdue\|partial**, notes |
| `expenses` | id, user_id, property_id, description, amount, category, date |
| `profiles` | id (= auth.users.id), plan (free/pro/portfolio), stripe_customer_id |

⚠️ **CRITICAL SCHEMA NOTES — do not get these wrong:**
- Payments table is `rent_payments` — NOT `payments`
- Properties table has `type` column — NOT `property_type`
- Properties table has `units_count` — NOT `units`
- Tenants use `first_name` + `last_name` columns — NOT a single `name` column
- `rent_payments` has `due_date` + `paid_date` — NOT `payment_date`
- `rent_payments` status values: `paid | due | overdue | partial`
- Tenant status values: `active | past | prospect`
- Unit details (beds/baths/sqft/rent) live in `units` table via FK — NOT on `properties`
- All Supabase joins use: `.select('*, tenants(first_name, last_name), properties(name)')`

**Schema file location:** `vestry/supabase/schema.sql` — run once in Supabase SQL editor to initialize.

---

## Auth & Demo Mode

### Real Login
- Supabase email/password auth
- On login → `useAuth` context populates `user`
- All DB queries filter by `user_id = user.id`

### Demo Login
- Email: `demo@vestry.app` / Password: `vestry2024`
- `isDemoUser(user)` returns `true` when `user.id === 'demo-user-id'`
- All pages check `isDemoUser` and serve local `demoLeases`, `demoTenants`, `demoProperties` arrays
- CRUD modals in demo mode: add to local state only (no Supabase write)
- Settings page in demo mode: shows "You're in demo mode" message, no auth changes allowed

### Settings Page
- `/settings` route (private)
- Change email → `supabase.auth.updateUser({ email })` → confirms via email link
- Change password → `supabase.auth.updateUser({ password })` → minimum 8 chars
- Sign out button

---

## Payment / Plan Flow

- Plans: `free`, `pro`, `portfolio` stored in `profiles.plan`
- `usePlan` hook reads plan from Supabase profiles table
- `isAdmin` flag also in usePlan
- Stripe customer ID stored in `profiles.stripe_customer_id`
- Pricing page at `/pricing`
- **Not fully implemented:** Stripe webhook → update plan on payment. Wired but needs Netlify function + Stripe webhook secret configured.

---

## CRUD Modal Pattern

All three modals follow the same pattern:
1. Overlay with `backdropFilter: blur(6px)` — click outside to close
2. Form with inline validation
3. `isDemoUser` check → if demo, call `onAdded(localObject)` and close; if real, Supabase insert → `onAdded(data)` and close
4. Parent page handles `onAdded` by prepending to state array (instant UI update, no re-fetch)

---

## Current Build Status

**As of last push (commit `026c33c` on main):**

✅ Full hi-fi design implemented (Geist font, iOS blue tokens, all pages)  
✅ Dashboard — stat cards with sparklines, donut chart, net income bezier chart; **real Supabase data for non-demo users**  
✅ Properties — card grid with SVG property thumbnails, Add Property modal wired; **units join fixed**  
✅ Tenants — table view with search, Add Tenant modal wired; **first_name/last_name + properties join fixed**  
✅ Payments — hero stats card + monthly bar chart + transaction table, Record Payment modal wired; **rent_payments table + correct joins**  
✅ Leases — list + detail side panel; **tenants + properties join fixed**  
✅ Expenses — full CRUD with category filtering, edit/delete, demo guard  
✅ Settings — email change + password change + sign out  
✅ Sidebar — Settings link added (Account section)  
✅ Mobile responsive — all grids collapse correctly on small screens  
✅ Demo mode fully functional (all pages show demo data; CRUD modals work in session)  
✅ AddPropertyModal — correct schema: `type`, `units_count`, unit insert into `units` table  
✅ AddTenantModal — correct schema: `first_name`/`last_name`, `property_id` FK, status `active|past|prospect`  
✅ RecordPaymentModal — correct schema: `rent_payments` table, `due_date`/`paid_date`, status `paid|due|overdue|partial`  
✅ Build clean — 0 errors, ~506kB bundle  
✅ Deployed to Netlify via GitHub auto-deploy  
✅ Onboarding PDF created: `Vestry Onboarding Guide.pdf` in vestry/ folder  

---

## Known Open Items / Next Steps

### High Priority
- **Reports page** — currently placeholder; could show YTD income summary, occupancy rate, expense breakdown
- **Leases "New lease" button** — the button exists but no modal is wired up yet
- **Monthly bar chart on Payments** — currently static demo data even for real users; needs real aggregation per month

### Medium Priority
- **Stripe webhook** — needs Netlify serverless function to receive `checkout.session.completed` and update `profiles.plan`
- **Property detail page** — clicking a property card should navigate to `/properties/:id` with full detail
- **Tenant detail** — clicking a tenant row should show a detail view or slide-over
- **Lease generation** — "New lease" flow with PDF generation (Stripe-gated feature)

### Low Priority / Polish
- **Empty state illustrations** — when user has no properties/tenants yet
- **Notifications bell** — header bell icon is static
- **On-time payment % calculation** — currently hardcoded in demo data
- **Date range filter on Payments** — filter pill is static

---

## Git Workflow

**Do NOT build in the mounted vestry folder** — write permissions are restricted.  
**Build and push approach:**
```bash
# 1. Sync src files from mounted folder to gitwork2 clone
rsync -av /sessions/.../mnt/vestry/src/ /sessions/.../gitwork2/src/

# 2. Build and verify
cd /sessions/.../gitwork2 && npm run build

# 3. Commit and push
git add -A && git commit -m "feat: ..." && \
git push https://luisguerrero4711:ghp_...TOKEN...@github.com/luisguerrero4711/vestry.git main
```

Netlify picks up the push and auto-deploys (usually ~1 min).

---

## Vestry Design Files Location

`/Vestry claude design/` folder (mounted alongside `/vestry/`):
- `vestry-shared.jsx` — canonical shared components (already ported to src/lib/vestry-shared.jsx)
- `hifi-tokens.css` — design tokens (already ported to src/styles/globals.css)
- `screen-*.jsx` — screen designs already implemented in pages/
- `Vestry Hi-Fi.html` — full HTML prototype for reference
- `Vestry Mobile.html` — mobile prototype for reference

---

## Environment / Config

- **Supabase URL + anon key:** in `src/lib/supabase.js` (hardcoded for now — move to .env for production)
- **Stripe key:** wired in Pricing/Admin pages
- **Resend key:** wired for transactional email (not fully active)
- `.env.example` in repo root for reference
