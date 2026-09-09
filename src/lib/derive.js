// ─────────────────────────────────────────────
// Vestry — derived metrics
// Pure helpers shared by demo mode and real mode so the two never drift.
// Everything in here is defensive: pass partial / empty arrays freely.
// ─────────────────────────────────────────────

import { rowCents, fromCents } from './money'

const arr = (x) => (Array.isArray(x) ? x : [])
const num = (x) => (Number.isFinite(Number(x)) ? Number(x) : 0)

// A payment row counts toward "rent" money unless it's tagged as a deposit
// or an imported opening balance (which are recordkeeping, not rent income).
const isRent = (p) => !p.type || p.type === 'rent' || p.type === 'fee'

// Parse a date value as LOCAL time. Bare 'YYYY-MM-DD' strings parse as UTC
// midnight otherwise, which lands on the previous day in western timezones.
const toDate = (d) => {
  if (d instanceof Date) return d
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) return new Date(d + 'T00:00:00')
  return new Date(d)
}

/** The active lease covering a given unit, if any. */
export function activeLeaseForUnit(unitId, leases) {
  if (!unitId) return null
  return arr(leases).find(
    (l) => l.unit_id === unitId && (l.status ?? 'active') === 'active'
  ) || null
}

/** The active lease for a given tenant, if any. */
export function activeLeaseForTenant(tenantId, leases) {
  if (!tenantId) return null
  return arr(leases).find(
    (l) => l.tenant_id === tenantId && (l.status ?? 'active') === 'active'
  ) || null
}

/** Scheduled monthly rent for one unit: active-lease rent, else the unit's list rent. */
export function unitScheduledRent(unit, leases) {
  if (!unit) return 0
  const lease = activeLeaseForUnit(unit.id, leases)
  return num(lease?.monthly_rent) || num(unit.rent_amount)
}

/** { totalUnits, occupiedUnits, vacantUnits, pct } across a set of units. */
export function computeOccupancy(units, leases) {
  const us = arr(units)
  const totalUnits = us.length
  const occupiedUnits = us.filter((u) => !!activeLeaseForUnit(u.id, leases)).length
  const vacantUnits = Math.max(0, totalUnits - occupiedUnits)
  const pct = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0
  return { totalUnits, occupiedUnits, vacantUnits, pct }
}

/** Total scheduled monthly rent across a set of units. */
export function scheduledRent(units, leases) {
  return arr(units).reduce((sum, u) => sum + unitScheduledRent(u, leases), 0)
}

/** VPill tone for a lease's lifecycle. */
export function leaseStatusTone(lease) {
  const status = lease?.status ?? 'active'
  if (status === 'expired' || status === 'terminated') return 'neutral'
  const end = lease?.end_date ? toDate(lease.end_date) : null
  if (end) {
    const days = Math.round((end - new Date()) / 86400000)
    if (days < 0) return 'danger'
    if (days <= 45) return 'warn'
  }
  return 'success'
}

/** Short human label for a lease's state. */
export function leaseStatusLabel(lease) {
  const status = lease?.status ?? 'active'
  if (status === 'expired') return 'Expired'
  if (status === 'terminated') return 'Terminated'
  const end = lease?.end_date ? toDate(lease.end_date) : null
  if (end) {
    const days = Math.round((end - new Date()) / 86400000)
    if (days < 0) return 'Ended'
    if (days <= 45) return `${days}d left`
  }
  return 'Active'
}

const fullName = (t) =>
  t ? [t.first_name, t.last_name].filter(Boolean).join(' ').trim() : ''

/**
 * One row per unit for the Rent Roll.
 * properties: [{ id, name, units: [{ id, unit_number, bedrooms, bathrooms, rent_amount, rooms:[] }] }]
 * (or pass flat `units` via opts.units). leases + tenants are flat arrays.
 */
export function buildRentRoll(properties, leases, tenants, opts = {}) {
  const props = arr(properties)
  const flatUnits = arr(opts.units)
  const rows = []

  const pushUnit = (prop, unit) => {
    const lease = activeLeaseForUnit(unit.id, leases)
    const tenant =
      arr(tenants).find((t) => t.id === lease?.tenant_id) ||
      arr(tenants).find((t) => t.unit_id === unit.id && t.status === 'active')
    const roomCount = arr(unit.rooms).length
    rows.push({
      propertyId: prop.id,
      propertyName: prop.name,
      unitId: unit.id,
      unitNumber: unit.unit_number || '1',
      beds: unit.bedrooms ?? null,
      baths: unit.bathrooms ?? null,
      roomCount,
      scheduledRent: unitScheduledRent(unit, leases),
      occupantName: fullName(tenant) || (lease ? 'Leased' : ''),
      occupied: !!lease,
      leaseId: lease?.id || null,
      leaseStatus: lease?.status || (roomCount ? 'by_room' : 'vacant'),
      leaseEnd: lease?.end_date || null,
    })
  }

  props.forEach((prop) => {
    const units = arr(prop.units).length
      ? arr(prop.units)
      : flatUnits.filter((u) => u.property_id === prop.id)
    units.forEach((u) => pushUnit(prop, u))
  })

  return rows
}

// ── money roll-ups (shared by Dashboard / Payments / PropertyDetail) ──
const sameMonth = (dateStr, ref = new Date()) => {
  if (!dateStr) return false
  const d = toDate(dateStr)
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth()
}

export function collectedThisMonth(payments) {
  const cents = arr(payments)
    .filter((p) => p.status === 'paid' && p.state !== 'reversed' && isRent(p) && sameMonth(p.paid_date))
    .reduce((s, p) => s + rowCents(p), 0)
  return fromCents(cents)
}

export function outstanding(payments) {
  const cents = arr(payments)
    .filter((p) => (p.status === 'due' || p.status === 'overdue' || p.status === 'partial') && p.state !== 'reversed')
    .reduce((s, p) => s + rowCents(p), 0)
  return fromCents(cents)
}

export function expensesThisMonth(expenses) {
  const cents = arr(expenses)
    .filter((e) => sameMonth(e.date))
    .reduce((s, e) => s + Math.round(num(e.amount) * 100), 0)
  return fromCents(cents)
}

/**
 * Money a lease still owes, in cents:
 *   opening balance  +  unpaid/partial rent & fee charges  (reversed rows excluded).
 * `payments` is the flat rent_payments array (filter to this lease's rows first,
 * or pass all and give the lease id via `leaseId`).
 */
export function leaseBalanceCents(lease, payments, leaseId = lease?.id) {
  const opening = Math.round(Number(lease?.opening_balance_cents) || 0)
  const owed = arr(payments)
    .filter((p) => p.lease_id === leaseId && isRent(p) && p.state !== 'reversed' &&
      (p.status === 'due' || p.status === 'overdue' || p.status === 'partial'))
    .reduce((s, p) => s + rowCents(p), 0)
  return opening + owed
}

/** Deposit held on a lease, in cents (recorded deposit payments, else the lease field). */
export function depositHeldCents(lease, payments, leaseId = lease?.id) {
  const recorded = arr(payments)
    .filter((p) => p.lease_id === leaseId && p.type === 'deposit' && p.status === 'paid' && p.state !== 'reversed')
    .reduce((s, p) => s + rowCents(p), 0)
  if (recorded) return recorded
  return Math.round((Number(lease?.security_deposit) || 0) * 100)
}

/** on-time rate = paid-on-or-before-due / all resolved, this + last few months */
export function onTimeRate(payments) {
  const resolved = arr(payments).filter((p) => p.status === 'paid' && p.paid_date && p.due_date)
  if (!resolved.length) return null
  const onTime = resolved.filter((p) => toDate(p.paid_date) <= toDate(p.due_date)).length
  return Math.round((onTime / resolved.length) * 100)
}

/** Last `n` calendar months of collected rent, oldest first: [{ label, amount }]. */
export function monthlyCollected(payments, n = 6) {
  const out = []
  const ref = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(ref.getFullYear(), ref.getMonth() - i, 1)
    const cents = arr(payments)
      .filter((p) => p.status === 'paid' && p.state !== 'reversed' && isRent(p) && sameMonth(p.paid_date, d))
      .reduce((s, p) => s + rowCents(p), 0)
    out.push({ label: d.toLocaleDateString('en-US', { month: 'short' }), amount: fromCents(cents) })
  }
  return out
}
