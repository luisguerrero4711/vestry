// ─────────────────────────────────────────────
// Money — always reason in integer cents, format at the edge.
// Never add / subtract dollar floats (0.1 + 0.2 !== 0.3).
// ─────────────────────────────────────────────

/** Dollars (number|string) -> integer cents. */
export function toCents(dollars) {
  if (dollars == null || dollars === '') return 0
  const n = typeof dollars === 'string' ? parseFloat(dollars) : dollars
  if (!Number.isFinite(n)) return 0
  return Math.round(n * 100)
}

/**
 * Best cents value for a rent_payments-style row: prefer the exact
 * `amount_cents` column, fall back to the legacy `amount` numeric.
 */
export function rowCents(row) {
  if (row && Number.isFinite(Number(row.amount_cents))) return Math.round(Number(row.amount_cents))
  return toCents(row ? row.amount : 0)
}

/** Integer cents -> dollars (number). */
export function fromCents(cents) {
  return Math.round(Number(cents) || 0) / 100
}

/** Sum a list in cents. `pick` maps an item -> cents (defaults to rowCents). */
export function sumCents(items, pick = rowCents) {
  return (Array.isArray(items) ? items : []).reduce((acc, it) => acc + Math.round(Number(pick(it)) || 0), 0)
}

/** Integer cents -> "$1,234" (no decimals) or "$1,234.56" when `withCents`. */
export function fmtCents(cents, { withCents = false } = {}) {
  const dollars = fromCents(cents)
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: withCents ? 2 : 0,
    maximumFractionDigits: withCents ? 2 : 0,
  }).format(dollars)
}
