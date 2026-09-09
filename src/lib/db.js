import { supabase } from './supabase'

// Columns added by the "ledger & launch-hardening" migration. If it hasn't
// been applied to this database yet, an insert/update that mentions them
// fails with 42703 / PGRST204 — so we transparently retry without them.
const LEDGER_KEYS = [
  'amount_cents', 'type', 'state', 'period', 'payer_tenant_id',
  'opening_balance_cents', 'opening_balance_date', 'end_reminder_days',
]

const isUnknownColumn = (err) =>
  err && (err.code === '42703' || err.code === 'PGRST204' ||
    /column .* does not exist|schema cache/i.test(err.message || ''))

const strip = (obj, keys) => {
  const out = { ...obj }
  keys.forEach((k) => delete out[k])
  return out
}

/**
 * insert rows, retrying once without the ledger columns if they aren't in
 * the schema yet. `rows` may be one object or an array. Returns { data, error }.
 */
export async function insertTolerant(table, rows, select = '*') {
  const list = Array.isArray(rows) ? rows : [rows]
  let res = await supabase.from(table).insert(list).select(select)
  if (res.error && isUnknownColumn(res.error)) {
    res = await supabase.from(table).insert(list.map((r) => strip(r, LEDGER_KEYS))).select(select)
  }
  return res
}

/** update, retrying once without the ledger columns if needed. */
export async function updateTolerant(table, patch, matchCol, matchVal) {
  let res = await supabase.from(table).update(patch).eq(matchCol, matchVal)
  if (res.error && isUnknownColumn(res.error)) {
    res = await supabase.from(table).update(strip(patch, LEDGER_KEYS)).eq(matchCol, matchVal)
  }
  return res
}
