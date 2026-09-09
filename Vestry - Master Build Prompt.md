# Vestry — Master Build Prompt
_Drop this into any AI to rebuild the full app from scratch._

---

## What You Are Building

**Vestry** is a property management SaaS for small landlords (1–20 units). It competes against free tools like TurboTenant by offering a significantly cleaner, more modern UI/UX. Paid plans gate premium features. The MVP covers: properties, tenants, leases, rent payments, expenses, and basic reporting.

**Positioning:** "TurboTenant but beautiful." The design quality IS the product differentiator.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | React 18 + Vite |
| Auth + DB | Supabase (email/password auth, Postgres, RLS) |
| Hosting | Netlify (auto-deploy from GitHub main branch) |
| Payments | Stripe (wired, partially active) |
| Icons | lucide-react + custom hand-coded SVG icons |
| Fonts | Geist + Geist Mono (load from Google Fonts in index.html) |
| Charts | Hand-coded SVG — NO chart libraries (no recharts, no chart.js) |
| Styling | Pure CSS custom properties — NO Tailwind, NO CSS-in-JS |

**Key package.json dependencies:**
```json
{
  "@supabase/supabase-js": "^2.43.0",
  "lucide-react": "^1.14.0",
  "react-router-dom": "^6.23.1",
  "stripe": "^14.25.0",
  "resend": "^3.2.0"
}
```

---

## Design System

### Philosophy
Apple/iOS-inspired. Clean, modern, never dated. Think iOS Settings app meets a premium SaaS dashboard. Generous whitespace, subtle shadows, smooth interactions. No gradients that look like 2015. No Bootstrap or Tailwind aesthetic.

### Typography
- Primary font: **Geist** (all UI text)
- Mono font: **Geist Mono** (numbers, amounts, data)
- Load in `index.html`: `https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap`

### CSS Custom Properties (`src/styles/globals.css` `:root`)

```css
:root {
  /* Surfaces */
  --bg-page:    oklch(0.985 0.003 250);   /* page background — very slightly blue-tinted white */
  --bg-elev-1:  oklch(1 0 0);             /* card surface — pure white */
  --bg-tint:    oklch(0.96 0.005 250);    /* subtle background tint */

  /* Brand — iOS blue */
  --brand:         oklch(0.62 0.18 255);
  --brand-tint:    oklch(0.96 0.04 255);
  --brand-pressed: oklch(0.55 0.18 255);

  /* Text */
  --text-1: oklch(0.15 0 0);       /* primary — near black */
  --text-2: oklch(0.45 0 0);       /* secondary — medium gray */
  --text-3: oklch(0.65 0 0);       /* tertiary — light gray */

  /* Status */
  --green: oklch(0.68 0.15 155);   --green-tint: oklch(0.95 0.05 155);
  --amber: oklch(0.78 0.15 75);    --amber-tint: oklch(0.97 0.05 75);
  --red:   oklch(0.62 0.2 25);     --red-tint:   oklch(0.96 0.04 25);

  /* Borders */
  --border:       oklch(0.92 0.003 250);
  --border-focus: var(--brand);

  /* Radius */
  --r-sm: 6px;
  --r-md: 10px;
  --r-lg: 14px;
  --r-xl: 18px;

  /* Shadows */
  --shadow-card: 0 1px 3px oklch(0 0 0 / 0.06), 0 1px 2px oklch(0 0 0 / 0.04);
  --shadow-modal: 0 20px 60px oklch(0 0 0 / 0.15);

  /* Sidebar */
  --sidebar-w: 220px;
}
```

### JS Token Object (in `src/lib/vestry-shared.jsx`)
This object lets components reference CSS variables without hardcoding hex values:
```js
export const VT = {
  brand:        'var(--brand)',
  brandTint:    'var(--brand-tint)',
  brandPressed: 'var(--brand-pressed)',
  card:         'var(--bg-elev-1)',
  page:         'var(--bg-page)',
  tint:         'var(--bg-tint)',
  text1:        'var(--text-1)',
  text2:        'var(--text-2)',
  text3:        'var(--text-3)',
  border:       'var(--border)',
  green:        'var(--green)',
  greenTint:    'var(--green-tint)',
  amber:        'var(--amber)',
  amberTint:    'var(--amber-tint)',
  red:          'var(--red)',
  redTint:      'var(--red-tint)',
  shadow:       'var(--shadow-card)',
  shadowModal:  'var(--shadow-modal)',
  rSm:          'var(--r-sm)',
  rMd:          'var(--r-md)',
  rLg:          'var(--r-lg)',
  rXl:          'var(--r-xl)',
};
```

**Rule: never hardcode color hex values in page components. Always use `VT.*`.**

### Responsive CSS Utilities (`globals.css`)

```css
.v-page {
  padding: 32px;
  background: var(--bg-page);
  min-height: 100%;
  overflow-y: auto;
}

.v-grid-4 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
@media (max-width: 1024px) {
  .v-grid-4 { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 600px) {
  .v-grid-4 { grid-template-columns: 1fr; }
  .v-page   { padding: 16px; }
}

.v-chart-row {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 16px;
}
@media (max-width: 1024px) {
  .v-chart-row { grid-template-columns: 1fr; }
}

.v-hero-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
@media (max-width: 860px) {
  .v-hero-row { grid-template-columns: 1fr; }
}

.v-detail-row {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 16px;
}
@media (max-width: 860px) {
  .v-detail-row { grid-template-columns: 1fr; }
}
```

**Rule: never use inline `@media` in JS. All responsive behavior goes in globals.css using these utilities.**

---

## Shared Component Library (`src/lib/vestry-shared.jsx`)

### VIcon
25 custom SVG icons. All take `{ size=18, color, style }` props.

```jsx
// Icon names: House, Person, Doc, Dollar, Chart, Search, Bell, Plus,
// Chevron, ChevronLeft, Up, Settings, Phone, Mail, MapPin, Calendar,
// Filter, Download, More, Check, Sparkle, Bed, Bath, Sqft, X, Lock, User

export function VIcon({ name, size = 18, color, style }) {
  const icons = {
    House: <path d="M3 12L12 4l9 8"/>,  // simplified — use proper paths
    // ... all 25 icons as SVG path strings
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color || 'currentColor'} strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" style={style}>
      {icons[name]}
    </svg>
  );
}
```

### VPill
Status badge. `tone` values: `neutral | success | warn | danger | brand`
```jsx
export function VPill({ children, tone = 'neutral' }) {
  const tones = {
    neutral: { bg: VT.tint,      color: VT.text2 },
    success: { bg: VT.greenTint, color: VT.green },
    warn:    { bg: VT.amberTint, color: VT.amber },
    danger:  { bg: VT.redTint,   color: VT.red   },
    brand:   { bg: VT.brandTint, color: VT.brand },
  };
  const t = tones[tone];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 20,
      background: t.bg, color: t.color,
      fontSize: 12, fontWeight: 500, letterSpacing: '0.01em',
    }}>
      {children}
    </span>
  );
}
```

### VAvatar
Colored circle with initials.
```jsx
export function VAvatar({ initials, size = 36, color }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: color || VT.brandTint,
      color: VT.brand, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      fontWeight: 600, fontSize: size * 0.38,
    }}>
      {initials}
    </div>
  );
}
```

### VSection
Card with optional header.
```jsx
export function VSection({ title, subtitle, action, children }) {
  return (
    <div style={{
      background: VT.card, borderRadius: VT.rLg,
      border: `1px solid ${VT.border}`,
      boxShadow: VT.shadow, overflow: 'hidden',
    }}>
      {title && (
        <div style={{
          padding: '16px 20px', borderBottom: `1px solid ${VT.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: VT.text1 }}>{title}</div>
            {subtitle && <div style={{ fontSize: 13, color: VT.text3, marginTop: 2 }}>{subtitle}</div>}
          </div>
          {action}
        </div>
      )}
      <div style={{ padding: '20px' }}>
        {children}
      </div>
    </div>
  );
}
```

### PropertyThumb
SVG property type illustration. `kind` values: `duplex | condo | townhome`
```jsx
export function PropertyThumb({ kind, label }) {
  // Renders a small, friendly SVG illustration of the property type
  // 80x60px, uses brand/tint colors
}
```

---

## Database Schema (Supabase)

All tables have `user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE`. Row Level Security (RLS) enabled on all tables. All queries filter by `user_id`.

```sql
-- profiles (auto-created on signup via trigger)
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text DEFAULT 'free' CHECK (plan IN ('free','pro','portfolio')),
  stripe_customer_id text
);

-- properties
CREATE TABLE properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  city text,
  state text,
  type text CHECK (type IN ('single_family','duplex','condo','townhome','apartment','commercial')),
  units_count integer DEFAULT 1,
  photo_url text,
  created_at timestamptz DEFAULT now()
);

-- units (linked to properties via FK)
CREATE TABLE units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  unit_number text,
  bedrooms integer,
  bathrooms numeric(3,1),
  sqft integer,
  rent_amount numeric(10,2)
);

-- tenants
CREATE TABLE tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  move_in_date date,
  status text DEFAULT 'active' CHECK (status IN ('active','past','prospect'))
);

-- leases
CREATE TABLE leases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES tenants(id),
  property_id uuid REFERENCES properties(id),
  start_date date,
  end_date date,
  monthly_rent numeric(10,2),
  security_deposit numeric(10,2),
  pdf_url text
);

-- rent_payments  ← TABLE IS NAMED rent_payments, NOT payments
CREATE TABLE rent_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES tenants(id),
  property_id uuid REFERENCES properties(id),
  amount numeric(10,2),
  due_date date,
  paid_date date,
  payment_method text,
  status text CHECK (status IN ('paid','due','overdue','partial')),
  notes text
);

-- expenses
CREATE TABLE expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id),
  description text,
  amount numeric(10,2),
  category text,
  date date DEFAULT now()
);
```

### ⚠️ CRITICAL — Never Get These Wrong

| Wrong | Correct |
|-------|---------|
| `payments` | `rent_payments` |
| `property_type` | `type` (on properties table) |
| `units` (on properties) | `units_count` |
| `name` (on tenants) | `first_name` + `last_name` |
| `payment_date` | `due_date` + `paid_date` |

### Supabase Join Patterns
```js
// Payments with tenant name + property name
supabase.from('rent_payments')
  .select('*, tenants(first_name, last_name), properties(name)')
  .eq('user_id', user.id)

// Properties with unit details
supabase.from('properties')
  .select('*, units(bedrooms, bathrooms, sqft, rent_amount)')
  .eq('user_id', user.id)

// Leases with tenant + property
supabase.from('leases')
  .select('*, tenants(first_name, last_name), properties(name)')
  .eq('user_id', user.id)

// Tenants with property name
supabase.from('tenants')
  .select('*, properties(name)')
  .eq('user_id', user.id)
```

---

## File & Folder Structure

```
vestry/
├── index.html                    ← Geist font import here
├── vite.config.js
├── package.json
├── netlify.toml                  ← redirects: /* → /index.html for SPA routing
├── .env.example
├── supabase/
│   └── schema.sql
└── src/
    ├── App.jsx                   ← Routes
    ├── main.jsx
    ├── styles/
    │   └── globals.css           ← ALL tokens + responsive utilities
    ├── lib/
    │   ├── vestry-shared.jsx     ← VT, VIcon, VPill, VAvatar, VSection, PropertyThumb
    │   ├── demoData.js           ← Static demo arrays + isDemoUser()
    │   └── supabase.js           ← createClient(url, anonKey)
    ├── hooks/
    │   ├── useAuth.jsx           ← Auth context, signOut
    │   └── usePlan.js            ← reads profiles.plan + isAdmin
    ├── components/
    │   ├── Layout.jsx            ← Sidebar + main content area + mobile hamburger
    │   ├── Sidebar.jsx           ← Nav sections: Main / Finance / Account
    │   ├── AddPropertyModal.jsx
    │   ├── AddTenantModal.jsx
    │   ├── RecordPaymentModal.jsx
    │   ├── KpiCard.jsx
    │   └── StatusPill.jsx
    └── pages/
        ├── Auth.jsx
        ├── Dashboard.jsx
        ├── Properties.jsx
        ├── Tenants.jsx
        ├── Payments.jsx
        ├── Leases.jsx
        ├── Expenses.jsx
        ├── Reports.jsx           ← Placeholder, see open items
        ├── Pricing.jsx
        ├── Admin.jsx
        └── Settings.jsx
```

### `netlify.toml`
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

---

## App Routes (`src/App.jsx`)

```jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Public: /auth
// Private (wrapped in Layout): /dashboard /properties /tenants /payments
//                               /leases /expenses /reports /pricing /admin /settings

// Auth guard: if no user, redirect to /auth
// After login: redirect to /dashboard
```

---

## Auth & Demo Mode

### Real Auth
Supabase email/password. `useAuth` hook provides `{ user, signOut }` to all components.

### Demo Mode
- **Email:** `demo@vestry.app` / **Password:** `vestry2024`
- The demo user has a hardcoded ID. Check: `user?.email === 'demo@vestry.app'`
- All pages show demo data from `demoData.js` when `isDemoUser(user)` is true
- CRUD modals in demo mode: add to local React state only — **never write to Supabase**
- Settings in demo mode: show "You're in demo mode" message, disable all fields

```js
// src/lib/demoData.js
export function isDemoUser(user) {
  return user?.email === 'demo@vestry.app';
}

export const demoProperties = [
  { id: 'dp1', name: 'Maple Street Duplex', address: '123 Maple St',
    city: 'Austin', state: 'TX', type: 'duplex', units_count: 2,
    units: [{ bedrooms: 2, bathrooms: 1, sqft: 850, rent_amount: 1400 }] },
  { id: 'dp2', name: 'Oak Ave Condo', address: '456 Oak Ave',
    city: 'Austin', state: 'TX', type: 'condo', units_count: 1,
    units: [{ bedrooms: 1, bathrooms: 1, sqft: 620, rent_amount: 1150 }] },
  { id: 'dp3', name: 'Pine St Townhome', address: '789 Pine St',
    city: 'Austin', state: 'TX', type: 'townhome', units_count: 3,
    units: [{ bedrooms: 3, bathrooms: 2, sqft: 1200, rent_amount: 1800 }] },
];

export const demoTenants = [
  { id: 'dt1', first_name: 'Marcus', last_name: 'Rivera',
    email: 'marcus.r@email.com', phone: '(512) 555-0101',
    status: 'active', move_in_date: '2023-06-01',
    properties: { name: 'Maple Street Duplex' } },
  { id: 'dt2', first_name: 'Sarah', last_name: 'Chen',
    email: 'sarah.c@email.com', phone: '(512) 555-0102',
    status: 'active', move_in_date: '2023-09-15',
    properties: { name: 'Oak Ave Condo' } },
  { id: 'dt3', first_name: 'James', last_name: 'Okafor',
    email: 'james.o@email.com', phone: '(512) 555-0103',
    status: 'prospect', move_in_date: null,
    properties: { name: 'Pine St Townhome' } },
];

export const demoPayments = [
  { id: 'dpay1', amount: 1400, status: 'paid', due_date: '2024-05-01',
    paid_date: '2024-05-01', payment_method: 'ACH',
    tenants: { first_name: 'Marcus', last_name: 'Rivera' },
    properties: { name: 'Maple Street Duplex' } },
  { id: 'dpay2', amount: 1150, status: 'overdue', due_date: '2024-05-01',
    paid_date: null, payment_method: null,
    tenants: { first_name: 'Sarah', last_name: 'Chen' },
    properties: { name: 'Oak Ave Condo' } },
];

export const demoLeases = [
  { id: 'dl1', start_date: '2023-06-01', end_date: '2024-06-01',
    monthly_rent: 1400, security_deposit: 1400,
    tenants: { first_name: 'Marcus', last_name: 'Rivera' },
    properties: { name: 'Maple Street Duplex' } },
];

export const demoExpenses = [
  { id: 'de1', description: 'HVAC repair', amount: 320,
    category: 'Maintenance', date: '2024-04-12',
    properties: { name: 'Maple Street Duplex' } },
  { id: 'de2', description: 'Property insurance', amount: 1200,
    category: 'Insurance', date: '2024-01-01',
    properties: { name: 'Oak Ave Condo' } },
];
```

---

## Layout & Navigation (`src/components/Layout.jsx` + `Sidebar.jsx`)

### Sidebar
Fixed left sidebar, 220px wide. Three sections:

**Main:** Dashboard, Properties, Tenants, Leases
**Finance:** Payments, Expenses, Reports
**Account:** Settings

Each nav item: icon (VIcon) + label. Active state: brand color background tint, brand text.

Mobile: hamburger button in top bar, sidebar slides in as overlay.

```jsx
// Sidebar visual style
const navItem = (active) => ({
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '8px 12px', borderRadius: VT.rMd,
  color: active ? VT.brand : VT.text2,
  background: active ? VT.brandTint : 'transparent',
  fontWeight: active ? 600 : 400,
  fontSize: 14, cursor: 'pointer',
  transition: 'all 0.15s',
});
```

### Layout shell
```
+--sidebar--+------------------main content------------------+
|           |  [page header: breadcrumb + actions]           |
|  Nav      |  [page body via <Outlet/>]                     |
|           |                                                  |
+-----------+--------------------------------------------------+
```

---

## CRUD Modal Pattern

All three "Add" modals follow the same structure:

1. **Overlay** — full-screen div with `backdropFilter: blur(6px)`, semi-transparent dark bg
2. **Card** — centered, `borderRadius: VT.rXl`, `boxShadow: VT.shadowModal`, max-width ~480px
3. **Header** — title + X close button
4. **Form** — labeled inputs with inline validation error text
5. **Footer** — Cancel + Submit (brand color button)
6. **Demo guard:** always check `isDemoUser(user)` BEFORE the Supabase insert:

```jsx
const handleSubmit = async () => {
  // validation...
  if (isDemoUser(user)) {
    onAdded({ id: `local-${Date.now()}`, ...formData });
    onClose();
    return;
  }
  const { data, error } = await supabase.from('...').insert([...]).select().single();
  if (error) { setError(error.message); return; }
  onAdded(data);
  onClose();
};
```

7. **Parent state update:** `onAdded(data)` callback prepends to array:
```jsx
const handleAdded = (item) => setItems(prev => [item, ...prev]);
```

---

## Page Specifications

### Dashboard (`/dashboard`)
**Purpose:** Overview of portfolio health at a glance.

**Layout:**
- Top: Page title "Dashboard" + subtitle with user's name
- Row 1: 4-column grid of KPI stat cards (`.v-grid-4`)
- Row 2: `.v-chart-row` — left: Net Income line chart | right: Occupancy donut chart
- Row 3: Recent activity / recent payments table

**KPI Cards (4):**
1. Total Revenue — sum of paid `rent_payments` this month — green trend icon if up
2. Properties — count of properties
3. Active Tenants — count of tenants with status='active'
4. Occupancy Rate — (active tenants / units_count) × 100

Each KPI card: white card, number in large Geist Mono, label below, sparkline SVG at right, tiny change % badge.

**Donut Chart (SVG, hand-coded):**
Occupied vs Vacant. Brand color for occupied, tint for vacant. Center label: occupancy %.

**Net Income Chart (SVG, hand-coded):**
6-month bezier line chart. Income (green) vs Expenses (red/amber) lines. X-axis: month labels.

**Demo vs Real:**
- Demo: use `demoProperties`, `demoTenants`, `demoPayments` to compute stats
- Real: fetch from Supabase on mount

---

### Properties (`/properties`)
**Purpose:** View and manage all properties.

**Layout:**
- Header: "Properties" title + "Add Property" button (brand filled button)
- Body: card grid (`.v-grid-4`)

**Property Card:**
- Top: `PropertyThumb` SVG illustration (type-based) with a colored pill for property type
- Body: property name (bold), address, city/state
- Footer: unit count, avg rent from `units` join
- Hover: subtle lift shadow

**Add Property Modal fields:**
- Property Name (text, required)
- Address, City, State (text)
- Property Type (select: single_family | duplex | condo | townhome | apartment | commercial)
- Number of Units (number, min 1)
- For each unit: Bedrooms, Bathrooms, Sqft, Monthly Rent

**Supabase insert pattern:**
```js
// Insert property first, then insert units
const { data: property } = await supabase.from('properties')
  .insert([{ user_id, name, address, city, state, type, units_count }])
  .select().single();

await supabase.from('units').insert(
  units.map(u => ({ property_id: property.id, ...u }))
);
```

---

### Tenants (`/tenants`)
**Purpose:** View and manage all tenants.

**Layout:**
- Header: "Tenants" title + search input + "Add Tenant" button
- Body: table with columns: Name, Property, Status, Phone, Email, Move-in Date

**Table row:**
- `VAvatar` with initials (first initial + last initial) + full name
- `VPill` for status: active→success, past→neutral, prospect→brand
- Search filters by first_name + last_name

**Add Tenant Modal fields:**
- First Name, Last Name (text, required)
- Email, Phone (text)
- Property (select from user's properties)
- Move-in Date (date)
- Status (select: active | past | prospect)

---

### Payments (`/payments`)
**Purpose:** Track rent collection.

**Layout:**
- Header: "Payments" + "Record Payment" button
- Row 1: `.v-hero-row` — Hero stats card (left) + Monthly bar chart (right)
- Row 2: Transaction table

**Hero stats card:**
- Total collected this month (sum of paid payments)
- Outstanding (sum of due/overdue)
- On-time rate %
- "This month" label

**Monthly bar chart (SVG):**
- 6 bars — one per month
- Heights proportional to total rent collected that month
- Hover tooltip showing amount

**Transaction table columns:** Tenant, Property, Amount, Due Date, Paid Date, Method, Status pill

**Record Payment Modal fields:**
- Tenant (select)
- Property (auto-fills from tenant selection)
- Amount (number, default to tenant's rent amount)
- Due Date (date)
- Paid Date (date, optional)
- Payment Method (select: ACH | Check | Cash | Venmo | Zelle | Other)
- Status (select: paid | due | overdue | partial)
- Notes (textarea)

---

### Leases (`/leases`)
**Purpose:** View active and past leases.

**Layout:** `.v-detail-row` — list on left, detail panel on right

**Lease list (left):**
Each item: tenant name, property name, date range, monthly rent amount. Click to select → populate right panel.

**Detail panel (right):**
- Tenant full name + avatar
- Property name
- Lease period (start → end)
- Monthly rent + security deposit
- Status pill (Active / Expired)
- "Download Lease" button (if pdf_url exists)
- "New Lease" button in header → modal (not yet built — show coming soon toast)

---

### Expenses (`/expenses`)
**Purpose:** Track maintenance, insurance, and other property costs.

**Layout:**
- Header: "Expenses" + "Add Expense" button + category filter pills
- Body: table or card list

**Table columns:** Date, Description, Category, Property, Amount

**Add Expense inline or modal:**
- Description (text)
- Amount (number)
- Category (select: Maintenance | Insurance | Taxes | Utilities | Management | Other)
- Property (select)
- Date (date)

**Full CRUD:** edit and delete existing expenses (pencil/trash icons on hover).

**Category filter:** pill buttons above table to filter by category.

---

### Reports (`/reports`)
**Status: Placeholder**
Show a "Coming soon" empty state with icon. Eventually: YTD income vs expenses, occupancy history, per-property P&L.

---

### Settings (`/settings`)
**Layout:** Stacked form sections in a max-width ~560px centered column

**Sections:**

1. **Change Email**
   - Email input (pre-filled with current)
   - Save button → `supabase.auth.updateUser({ email: newEmail })`
   - Success: "Confirmation email sent to [email]"

2. **Change Password**
   - New Password input (min 8 chars)
   - Save button → `supabase.auth.updateUser({ password })`

3. **Sign Out**
   - Red "Sign Out" button → `supabase.auth.signOut()` → redirect to `/auth`

**Demo mode:** Replace all sections with a notice: "You're viewing Vestry in demo mode. Sign up for a real account to manage your properties." No functional inputs.

---

### Pricing (`/pricing`)
Three-column plan card layout:

| Plan | Price | Features |
|------|-------|---------|
| Free | $0/mo | Up to 3 properties, basic features |
| Pro | $19/mo | Up to 15 properties, all features |
| Portfolio | $49/mo | Unlimited properties, team access |

CTA button → Stripe checkout (wired but not fully live).

---

### Auth (`/auth`)
Clean centered card:
- Vestry logo/wordmark
- Toggle: Sign In / Sign Up
- Email + Password inputs
- Submit button (brand color)
- Demo login link: "Try demo — no account needed"

Demo login sets a local user object rather than hitting Supabase.

---

## Key Implementation Patterns

### Data Fetching Pattern (Real User)
```jsx
const [items, setItems] = useState([]);
const [loading, setLoading] = useState(true);
const { user } = useAuth();

useEffect(() => {
  if (!user) return;
  if (isDemoUser(user)) {
    setItems(demoItems);
    setLoading(false);
    return;
  }
  const fetch = async () => {
    const { data, error } = await supabase
      .from('table_name')
      .select('*, related_table(columns)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (!error) setItems(data || []);
    setLoading(false);
  };
  fetch();
}, [user]);
```

### Button Styles
```jsx
// Primary
const btnPrimary = {
  background: VT.brand, color: '#fff',
  border: 'none', borderRadius: VT.rMd,
  padding: '9px 18px', fontSize: 14,
  fontWeight: 500, cursor: 'pointer',
  display: 'flex', alignItems: 'center', gap: 6,
};

// Ghost/Secondary
const btnGhost = {
  background: 'transparent', color: VT.text2,
  border: `1px solid ${VT.border}`, borderRadius: VT.rMd,
  padding: '9px 18px', fontSize: 14,
  fontWeight: 500, cursor: 'pointer',
};

// Danger
const btnDanger = {
  background: VT.redTint, color: VT.red,
  border: 'none', borderRadius: VT.rMd,
  padding: '9px 18px', fontSize: 14,
  fontWeight: 500, cursor: 'pointer',
};
```

### Input Styles
```jsx
const input = {
  width: '100%', padding: '9px 12px',
  border: `1px solid ${VT.border}`,
  borderRadius: VT.rMd, fontSize: 14,
  color: VT.text1, background: '#fff',
  outline: 'none', boxSizing: 'border-box',
};
// On focus: border-color: var(--brand)
// On error: border-color: var(--red)
```

---

## Plan Gating (`usePlan` hook)

```js
// src/hooks/usePlan.js
export function usePlan() {
  const { user } = useAuth();
  const [plan, setPlan] = useState('free');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user || isDemoUser(user)) return;
    supabase.from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) setPlan(data.plan);
        setIsAdmin(user.email === 'aluisguerrero12@gmail.com');
      });
  }, [user]);

  return { plan, isAdmin, isPro: plan === 'pro' || plan === 'portfolio' };
}
```

---

## Supabase Client (`src/lib/supabase.js`)

```js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseKey);
```

---

## Current Build Status

### Fully Built ✅
- Full hi-fi design system (Geist, oklch tokens, all responsive)
- Dashboard with real Supabase data + SVG charts
- Properties page + Add Property modal (correct schema)
- Tenants page + Add Tenant modal (correct schema)
- Payments page + Record Payment modal (correct `rent_payments` table)
- Leases page with detail side panel
- Expenses page with full CRUD + category filter
- Settings: email change, password change, sign out
- Auth page with demo login
- Sidebar with all nav sections
- Mobile responsive (hamburger nav, collapsing grids)
- Demo mode fully functional across all pages
- Netlify deploy via GitHub auto-deploy

### Open / Incomplete 🔲
1. **Reports page** — placeholder; needs YTD income summary, occupancy chart, expense breakdown
2. **New Lease modal** — button exists but modal not built
3. **Monthly bar chart on Payments** — static even for real users; needs real aggregation
4. **Stripe webhook** — `checkout.session.completed` → update `profiles.plan` (needs Netlify function)
5. **Property detail page** — `/properties/:id` click-through not built
6. **Tenant detail** — click-through detail view not built
7. **Empty states** — new users with no data see blank pages (no illustrations yet)
8. **Notifications bell** — static, no functionality

---

## What Makes Vestry Different (Design Principles)

1. **No library defaults.** Every component is custom — no MUI, no Chakra, no shadcn. The brand is the design.
2. **oklch colors.** More vibrant, perceptually uniform colors than hex.
3. **SVG-everything.** Charts are hand-coded SVG polylines/paths — keeps bundle tiny and gives total design control.
4. **Real data on day one.** Even the MVP fetches from Supabase — not mock data behind a real-looking UI.
5. **Demo that sells.** The demo account is a polished sales tool, not an afterthought.
6. **Mobile-first grid collapses.** Every layout degrades gracefully — `.v-grid-4` becomes 2-col at 1024px, 1-col at 600px.

---

_This prompt contains everything needed to build Vestry from scratch: product, design, schema, components, pages, and patterns. Build it in order: design system → auth → layout → pages → modals._
