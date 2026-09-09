import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { insertTolerant } from '../lib/db'
import { useAuth } from '../hooks/useAuth'
import { isDemoUser, demoLeases, demoPayments } from '../lib/demoData'
import { VT, VIcon } from '../lib/vestry-shared'
import { toCents, fmtCents } from '../lib/money'

const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
const monthLabel = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

// next month, first day
function defaultPeriod() {
  const n = new Date()
  return monthKey(new Date(n.getFullYear(), n.getMonth() + 1, 1))
}
function periodOptions() {
  const n = new Date()
  const opts = []
  for (let i = -1; i <= 2; i++) opts.push(monthKey(new Date(n.getFullYear(), n.getMonth() + i, 1)))
  return opts
}

/**
 * Generate one 'rent' charge per active lease for a chosen month.
 * Idempotent: leases that already have a charge for that period are skipped.
 * props: onClose, onGenerated(rows)
 */
export default function GenerateRentModal({ onClose, onGenerated }) {
  const { user } = useAuth()
  const demo = isDemoUser(user)
  const [period, setPeriod] = useState(defaultPeriod())
  const [leases, setLeases] = useState([])
  const [existing, setExisting] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      if (demo) {
        setLeases(demoLeases.filter(l => (l.status ?? 'active') === 'active'))
        setExisting(new Set(demoPayments.filter(p => p.type === 'rent' && p.period === period).map(p => p.lease_id)))
        setLoading(false)
        return
      }
      const [{ data: ls }, { data: ex }] = await Promise.all([
        supabase.from('leases')
          .select('id, tenant_id, property_id, unit_id, room_id, monthly_rent, start_date, tenants(first_name,last_name), properties(name), units(unit_number)')
          .eq('user_id', user.id).eq('status', 'active'),
        supabase.from('rent_payments')
          .select('lease_id').eq('user_id', user.id).eq('type', 'rent').eq('period', period),
      ])
      setLeases(ls || [])
      setExisting(new Set((ex || []).map(r => r.lease_id)))
      setLoading(false)
    }
    load()
  }, [user, demo, period])

  const rows = useMemo(() => leases.map(l => {
    const name = l.tenants ? `${l.tenants.first_name} ${l.tenants.last_name}`.trim() : (l.tenant || 'Tenant')
    return {
      lease: l,
      name,
      where: `${l.properties?.name || l.property || '—'}${l.units?.unit_number ? ` · Unit ${l.units.unit_number}` : ''}`,
      rent: Number(l.monthly_rent || 0),
      already: existing.has(l.id),
    }
  }), [leases, existing])

  const toCreate = rows.filter(r => !r.already && r.rent > 0)
  const total = toCreate.reduce((s, r) => s + r.rent, 0)

  const generate = async () => {
    if (!toCreate.length) return
    setSaving(true); setError('')
    const due_date = period  // rent due on the 1st of the period
    const mk = (r) => ({
      user_id: user?.id || 'demo-user-id',
      lease_id: r.lease.id,
      tenant_id: r.lease.tenant_id || null,
      property_id: r.lease.property_id,
      unit_id: r.lease.unit_id || null,
      room_id: r.lease.room_id || null,
      type: 'rent',
      period,
      amount: r.rent,
      amount_cents: toCents(r.rent),
      due_date,
      paid_date: null,
      status: 'due',
      state: 'recorded',
      notes: `Rent — ${monthLabel(period)}`,
    })

    if (demo) {
      onGenerated?.(toCreate.map((r, i) => ({
        id: `demo-rent-${period}-${i}`, ...mk(r),
        tenants: r.lease.tenants || null,
        properties: r.lease.properties || null,
      })))
      onClose(); return
    }

    const { data, error: err } = await insertTolerant(
      'rent_payments', toCreate.map(mk), '*, tenants(first_name, last_name), properties(name)'
    )
    setSaving(false)
    if (err) { setError(err.message); return }
    onGenerated?.(data || [])
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: VT.card, borderRadius: 18, width: '100%', maxWidth: 480, boxShadow: VT.shadowLg, maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${VT.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: VT.fontDisplay, fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em' }}>Generate rent</div>
            <div style={{ fontSize: 12, color: VT.text3, fontWeight: 500, marginTop: 2 }}>One charge per active lease</div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, background: VT.tint, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <VIcon.X s={14} c={VT.text2} />
          </button>
        </div>

        <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 13 }}>
          {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#b91c1c', fontWeight: 500 }}>{error}</div>}
          {demo && <div style={{ background: VT.brandTint, borderRadius: 8, padding: '8px 12px', fontSize: 12, color: VT.brand, fontWeight: 500 }}>Demo mode — saved for this session only.</div>}

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: VT.text3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, display: 'block' }}>Month</label>
            <select value={period} onChange={e => setPeriod(e.target.value)} style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${VT.line}`, borderRadius: 10, background: VT.card, color: VT.text1, fontFamily: VT.fontText, fontSize: 13, fontWeight: 500, cursor: 'pointer', outline: 'none' }}>
              {periodOptions().map(o => <option key={o} value={o}>{monthLabel(o)}</option>)}
            </select>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 20, color: VT.text3, fontWeight: 500, fontSize: 13 }}>Loading leases…</div>
          ) : rows.length === 0 ? (
            <div style={{ fontSize: 13, color: VT.text3, fontWeight: 500 }}>No active leases to charge.</div>
          ) : (
            <div style={{ border: `1px solid ${VT.line}`, borderRadius: 10, overflow: 'hidden' }}>
              {rows.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 12px', borderTop: i ? `1px solid ${VT.line}` : 'none', opacity: r.already || r.rent <= 0 ? 0.5 : 1 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{r.name}</div>
                    <div style={{ fontSize: 11, color: VT.text3, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.where}</div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: r.already ? VT.text3 : VT.text1, whiteSpace: 'nowrap' }}>
                    {r.rent > 0 ? fmtCents(toCents(r.rent)) : 'no rent set'}{r.already ? ' · done' : ''}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '10px', background: VT.tint, border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, color: VT.text2, cursor: 'pointer' }}>Cancel</button>
            <button onClick={generate} disabled={saving || toCreate.length === 0} style={{ flex: 2, padding: '10px', background: VT.brand, border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer', opacity: (saving || toCreate.length === 0) ? 0.55 : 1 }}>
              {saving ? 'Generating…' : toCreate.length === 0 ? 'Nothing to generate' : `Generate ${toCreate.length} · ${fmtCents(toCents(total))}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
