// ─────────────────────────────────────────────
// Vestry Demo Mode — sample data for showcasing
// Login: demo@vestry.app / vestry2024
// ─────────────────────────────────────────────

export const DEMO_EMAIL    = 'demo@vestry.app'
export const DEMO_PASSWORD = 'vestry2024'

export const DEMO_USER = {
  id: 'demo-user-id',
  email: DEMO_EMAIL,
}

// ── IDs
const P1 = 'demo-prop-oak'
const P2 = 'demo-prop-river'
const P3 = 'demo-prop-maple'
const U1A = 'demo-unit-oak-a'
const U1B = 'demo-unit-oak-b'
const U2  = 'demo-unit-river'
const U3  = 'demo-unit-maple'
const R1 = 'demo-room-oak-a-1'
const R2 = 'demo-room-oak-a-2'
const R3 = 'demo-room-oak-a-3'
const T1 = 'demo-ten-chen'
const T2 = 'demo-ten-williams'
const T3 = 'demo-ten-patel'
const T4 = 'demo-ten-obrien'

// ── Helper for current/last month strings
const now       = new Date()
const yr        = now.getFullYear()
const cm        = String(now.getMonth() + 1).padStart(2, '0')          // current month
const lm        = String(now.getMonth() === 0 ? 12 : now.getMonth()).padStart(2, '0') // last month
const lmYr      = now.getMonth() === 0 ? yr - 1 : yr

// ── Rooms (children of a unit) — only Oak St Unit A is rented by the room
export const demoRooms = [
  { id: R1, unit_id: U1A, name: 'Primary suite', monthly_rent: 700, size_sqft: 240, notes: '' },
  { id: R2, unit_id: U1A, name: 'Bedroom 2',     monthly_rent: 550, size_sqft: 160, notes: '' },
  { id: R3, unit_id: U1A, name: 'Bedroom 3',     monthly_rent: 500, size_sqft: 150, notes: '' },
]

// ── Units (children of a property)
export const demoUnits = [
  { id: U1A, property_id: P1, unit_number: 'A', bedrooms: 3, bathrooms: 2,   sqft: 1400, rent_amount: 1450, notes: '' },
  { id: U1B, property_id: P1, unit_number: 'B', bedrooms: 2, bathrooms: 1,   sqft: 1050, rent_amount: 1200, notes: '' },
  { id: U2,  property_id: P2, unit_number: '1', bedrooms: 2, bathrooms: 2,   sqft: 1100, rent_amount: 1800, notes: '' },
  { id: U3,  property_id: P3, unit_number: '1', bedrooms: 3, bathrooms: 2.5, sqft: 1600, rent_amount: 1650, notes: '' },
]

const roomsFor = (unitId) => demoRooms.filter(r => r.unit_id === unitId)
const unitsFor = (propId) => demoUnits
  .filter(u => u.property_id === propId)
  .map(u => ({ ...u, rooms: roomsFor(u.id) }))

// ── Properties
export const demoProperties = [
  {
    id: P1, user_id: 'demo-user-id',
    name: 'Oak Street Duplex', address: '2406 Oak St',
    city: 'Austin', state: 'TX', zip: '78701',
    type: 'duplex', units_count: 2, market_value: 385000,
    notes: 'Built 1987. Roof replaced 2021. Two separate HVAC systems. Unit A rented by the room.',
    created_at: '2024-01-01',
    units: unitsFor(P1),
  },
  {
    id: P2, user_id: 'demo-user-id',
    name: 'Riverside Condo', address: '815 River Rd #4B',
    city: 'Denver', state: 'CO', zip: '80202',
    type: 'condo', units_count: 1, market_value: 310000,
    notes: 'HOA $220/mo — includes water and trash.',
    created_at: '2024-03-15',
    units: unitsFor(P2),
  },
  {
    id: P3, user_id: 'demo-user-id',
    name: 'Maple Ave Townhome', address: '1102 Maple Ave',
    city: 'Nashville', state: 'TN', zip: '37201',
    type: 'single_family', units_count: 1, market_value: 265000,
    notes: 'Vacant — refreshed interior between tenants. Listing soon.',
    created_at: '2024-06-01',
    units: unitsFor(P3),
  },
]

// ── Tenants
export const demoTenants = [
  {
    id: T1, user_id: 'demo-user-id', property_id: P1, unit_id: U1A, room_id: R1,
    first_name: 'Sarah', last_name: 'Chen',
    email: 'sarah.chen@email.com', phone: '(512) 555-0142',
    move_in_date: '2024-01-15', move_out_date: null,
    status: 'active', notes: 'Excellent tenant. Always pays on the 1st.',
    properties: { name: 'Oak Street Duplex', city: 'Austin', state: 'TX' },
    units: { unit_number: 'A' }, rooms: { name: 'Primary suite' },
  },
  {
    id: T2, user_id: 'demo-user-id', property_id: P1, unit_id: U1B, room_id: null,
    first_name: 'Marcus', last_name: 'Williams',
    email: 'marcus.w@email.com', phone: '(512) 555-0287',
    move_in_date: '2023-03-01', move_out_date: null,
    status: 'active', notes: 'Works remotely. Very quiet.',
    properties: { name: 'Oak Street Duplex', city: 'Austin', state: 'TX' },
    units: { unit_number: 'B' }, rooms: null,
  },
  {
    id: T3, user_id: 'demo-user-id', property_id: P2, unit_id: U2, room_id: null,
    first_name: 'Priya', last_name: 'Patel',
    email: 'priya.patel@email.com', phone: '(720) 555-0391',
    move_in_date: '2024-08-01', move_out_date: null,
    status: 'active', notes: 'Called on the 8th about rent — says payment incoming.',
    properties: { name: 'Riverside Condo', city: 'Denver', state: 'CO' },
    units: { unit_number: '1' }, rooms: null,
  },
  {
    id: T4, user_id: 'demo-user-id', property_id: P3, unit_id: U3, room_id: null,
    first_name: 'James', last_name: "O'Brien",
    email: 'jobrien@email.com', phone: '(615) 555-0419',
    move_in_date: '2022-06-01', move_out_date: '2024-11-30',
    status: 'past', notes: 'Moved out Nov 2024. Good standing.',
    properties: { name: 'Maple Ave Townhome', city: 'Nashville', state: 'TN' },
    units: { unit_number: '1' }, rooms: null,
  },
]

// ── Payments (current + last month)
export const demoPayments = [
  // Current month
  {
    id: 'pay-cm-1', user_id: 'demo-user-id', property_id: P1, unit_id: U1A, tenant_id: T1, lease_id: 'lease-1',
    amount: 1450, due_date: `${yr}-${cm}-01`, paid_date: `${yr}-${cm}-01`,
    payment_method: 'bank_transfer', status: 'paid', notes: '',
    tenants: { first_name: 'Sarah', last_name: 'Chen' },
    properties: { name: 'Oak Street Duplex', city: 'Austin', state: 'TX' },
  },
  {
    id: 'pay-cm-2', user_id: 'demo-user-id', property_id: P1, unit_id: U1B, tenant_id: T2, lease_id: 'lease-2',
    amount: 1200, due_date: `${yr}-${cm}-01`, paid_date: `${yr}-${cm}-03`,
    payment_method: 'check', status: 'paid', notes: '',
    tenants: { first_name: 'Marcus', last_name: 'Williams' },
    properties: { name: 'Oak Street Duplex', city: 'Austin', state: 'TX' },
  },
  {
    id: 'pay-cm-3', user_id: 'demo-user-id', property_id: P2, unit_id: U2, tenant_id: T3, lease_id: 'lease-3',
    amount: 1800, due_date: `${yr}-${cm}-01`, paid_date: null,
    payment_method: null, status: 'overdue', notes: 'Called on the 8th — says payment incoming.',
    tenants: { first_name: 'Priya', last_name: 'Patel' },
    properties: { name: 'Riverside Condo', city: 'Denver', state: 'CO' },
  },
  // Last month (all paid)
  {
    id: 'pay-lm-1', user_id: 'demo-user-id', property_id: P1, unit_id: U1A, tenant_id: T1, lease_id: 'lease-1',
    amount: 1450, due_date: `${lmYr}-${lm}-01`, paid_date: `${lmYr}-${lm}-01`,
    payment_method: 'bank_transfer', status: 'paid', notes: '',
    tenants: { first_name: 'Sarah', last_name: 'Chen' },
    properties: { name: 'Oak Street Duplex', city: 'Austin', state: 'TX' },
  },
  {
    id: 'pay-lm-2', user_id: 'demo-user-id', property_id: P1, unit_id: U1B, tenant_id: T2, lease_id: 'lease-2',
    amount: 1200, due_date: `${lmYr}-${lm}-01`, paid_date: `${lmYr}-${lm}-02`,
    payment_method: 'check', status: 'paid', notes: '',
    tenants: { first_name: 'Marcus', last_name: 'Williams' },
    properties: { name: 'Oak Street Duplex', city: 'Austin', state: 'TX' },
  },
  {
    id: 'pay-lm-3', user_id: 'demo-user-id', property_id: P2, unit_id: U2, tenant_id: T3, lease_id: 'lease-3',
    amount: 1800, due_date: `${lmYr}-${lm}-01`, paid_date: `${lmYr}-${lm}-05`,
    payment_method: 'bank_transfer', status: 'paid', notes: '',
    tenants: { first_name: 'Priya', last_name: 'Patel' },
    properties: { name: 'Riverside Condo', city: 'Denver', state: 'CO' },
  },
]

// ── Leases  (active ones end next year so the demo always looks current)
const nextYr = yr + 1
export const demoLeases = [
  {
    id: 'lease-1', user_id: 'demo-user-id', property_id: P1, unit_id: U1A, tenant_id: T1,
    start_date: `${yr - 1}-01-15`, end_date: `${nextYr}-01-14`,
    monthly_rent: 1450, security_deposit: 1450,
    status: 'active', pdf_url: null, notes: '',
    tenants: { first_name: 'Sarah', last_name: 'Chen' },
    properties: { name: 'Oak Street Duplex' },
    units: { unit_number: 'A' },
  },
  {
    id: 'lease-2', user_id: 'demo-user-id', property_id: P1, unit_id: U1B, tenant_id: T2,
    start_date: `${yr - 2}-03-01`, end_date: `${nextYr}-02-28`,
    monthly_rent: 1200, security_deposit: 1200,
    status: 'active', pdf_url: null, notes: '',
    tenants: { first_name: 'Marcus', last_name: 'Williams' },
    properties: { name: 'Oak Street Duplex' },
    units: { unit_number: 'B' },
  },
  {
    id: 'lease-3', user_id: 'demo-user-id', property_id: P2, unit_id: U2, tenant_id: T3,
    start_date: `${yr - 1}-08-01`, end_date: `${nextYr}-07-31`,
    monthly_rent: 1800, security_deposit: 2700,
    status: 'active', pdf_url: null, notes: 'Pet deposit included in security.',
    tenants: { first_name: 'Priya', last_name: 'Patel' },
    properties: { name: 'Riverside Condo' },
    units: { unit_number: '1' },
  },
  {
    id: 'lease-4', user_id: 'demo-user-id', property_id: P3, unit_id: U3, tenant_id: T4,
    start_date: '2022-06-01', end_date: '2024-11-30',
    monthly_rent: 1650, security_deposit: 1650,
    status: 'expired', pdf_url: null, notes: '',
    tenants: { first_name: 'James', last_name: "O'Brien" },
    properties: { name: 'Maple Ave Townhome' },
    units: { unit_number: '1' },
  },
]

// ── Expenses
export const demoExpenses = [
  {
    id: 'exp-1', user_id: 'demo-user-id', property_id: P1,
    category: 'insurance', description: 'Annual landlord insurance renewal',
    amount: 1240, date: `${yr}-01-15`, vendor: 'State Farm', notes: '',
    properties: { name: 'Oak Street Duplex' },
  },
  {
    id: 'exp-2', user_id: 'demo-user-id', property_id: P1,
    category: 'maintenance', description: 'HVAC tune-up — Unit A',
    amount: 185, date: `${yr}-${cm}-10`, vendor: 'CoolAir Services',
    notes: 'Annual service. Filter replaced.',
    properties: { name: 'Oak Street Duplex' },
  },
  {
    id: 'exp-3', user_id: 'demo-user-id', property_id: P2,
    category: 'maintenance', description: 'Bathroom faucet replacement',
    amount: 320, date: `${yr}-${cm}-08`, vendor: 'Denver Plumbing Co.', notes: '',
    properties: { name: 'Riverside Condo' },
  },
  {
    id: 'exp-4', user_id: 'demo-user-id', property_id: P1,
    category: 'taxes', description: 'Q2 property tax installment',
    amount: 980, date: `${yr}-04-15`, vendor: 'Travis County Tax Office', notes: '',
    properties: { name: 'Oak Street Duplex' },
  },
  {
    id: 'exp-5', user_id: 'demo-user-id', property_id: P3,
    category: 'maintenance', description: 'Interior repaint between tenants',
    amount: 1850, date: `${lmYr}-${lm}-20`, vendor: 'Brush & Roll LLC',
    notes: 'Full interior — walls, trim, ceilings.',
    properties: { name: 'Maple Ave Townhome' },
  },
  {
    id: 'exp-6', user_id: 'demo-user-id', property_id: P2,
    category: 'management', description: 'HOA monthly fee',
    amount: 220, date: `${yr}-${cm}-01`, vendor: 'Riverside HOA',
    notes: 'Includes water and trash.',
    properties: { name: 'Riverside Condo' },
  },
]

// ── Helper
export const isDemoUser = (user) => user?.id === 'demo-user-id'
