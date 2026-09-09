import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { isDemoUser } from '../lib/demoData'
import { VT, VIcon } from '../lib/vestry-shared'

const today = () => new Date().toISOString().slice(0, 10)

/**
 * End a lease: set status, optionally cancel unpaid rent charges dated after the
 * end date, free the space, and mark the tenant past. History is preserved.
 * props: lease, onClose, onEnded(fields)
 */
export default function EndLeaseModal({ lease, onClose, onEnded }) {
  const { user } = useAuth()
  const demo = isDemoUser(user)
  const [endDate, setEndDate] = useState(lease?.end_date && lease.end_date < today() ? lease.end_date : today())
  const [cancelFuture, setCancelFuture] = useState(true)
  const [markPast, setMarkPast] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // ended early vs ran its course
  const early = lease?.end_date && endDate < lease.end_date
  const status = early ? 'terminated' : 'expired'

  const submit = async () => {
    setSaving(true); setError('')
    const fields = { status, end_date: endDate }

    if (demo) { onEnded?.(fields); onClose(); return }

    const { error: e1 } = await supabase.from('leases').update(fields).eq('id', lease.id)
    if (e1) { setError(e1.message); setSaving(false); return }

    if (cancelFuture) {
      // reversed rows drop out of every balance/collection roll-up
      await supabase.from('rent_payments')
        .update({ state: 'reversed', notes: 'Cancelled — lease ended' })
        .eq('lease_id', lease.id).in('status', ['due', 'overdue', 'partial']).gt('due_date', endDate)
    }
    if (lease.tenant_id) {
      const patch = { room_id: null }
      if (markPast) patch.status = 'past'
      await supabase.from('tenants').update(patch).eq('id', lease.tenant_id)
    }
    setSaving(false)
    onEnded?.(fields)
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: VT.card, borderRadius: 18, width: '100%', maxWidth: 420, boxShadow: VT.shadowLg }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${VT.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: VT.fontDisplay, fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em' }}>End lease</div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, background: VT.tint, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <VIcon.X s={14} c={VT.text2} />
          </button>
        </div>
        <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 13 }}>
          {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#b91c1c', fontWeight: 500 }}>{error}</div>}
          {demo && <div style={{ background: VT.brandTint, borderRadius: 8, padding: '8px 12px', fontSize: 12, color: VT.brand, fontWeight: 500 }}>Demo mode — saved for this session only.</div>}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: VT.text3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, display: 'block' }}>End date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${VT.line}`, borderRadius: 10, background: VT.card, color: VT.text1, fontFamily: VT.fontText, fontSize: 13, fontWeight: 500, outline: 'none' }} />
            <div style={{ fontSize: 11, color: VT.text3, fontWeight: 500, marginTop: 5 }}>
              {early ? 'Earlier than the lease term — marks the lease terminated.' : 'Marks the lease expired.'} Past balances and history are kept.
            </div>
          </div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, color: VT.text2, fontWeight: 500 }}>
            <input type="checkbox" checked={cancelFuture} onChange={e => setCancelFuture(e.target.checked)} style={{ marginTop: 2 }} />
            Cancel unpaid rent charges dated after the end date
          </label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, color: VT.text2, fontWeight: 500 }}>
            <input type="checkbox" checked={markPast} onChange={e => setMarkPast(e.target.checked)} style={{ marginTop: 2 }} />
            Mark the tenant as past and free their room
          </label>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '10px', background: VT.tint, border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, color: VT.text2, cursor: 'pointer' }}>Cancel</button>
            <button onClick={submit} disabled={saving} style={{ flex: 2, padding: '10px', background: VT.redTint, border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, color: VT.red, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Ending…' : 'End lease'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
