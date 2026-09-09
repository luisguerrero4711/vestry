import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { updateTolerant } from '../lib/db'
import { useAuth } from '../hooks/useAuth'
import { isDemoUser } from '../lib/demoData'
import { VT, VIcon } from '../lib/vestry-shared'
import { rowCents, fmtCents } from '../lib/money'

/**
 * Reverse a recorded payment. Never deletes: sets state='reversed',
 * flips the charge back to outstanding, and writes a payment_events row.
 * props: payment (raw rent_payments row), onClose, onVoided(id, fields)
 */
export default function VoidPaymentModal({ payment, onClose, onVoided }) {
  const { user } = useAuth()
  const demo = isDemoUser(user)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const name = payment.tenants ? `${payment.tenants.first_name || ''} ${payment.tenants.last_name || ''}`.trim() : 'this payment'
  // if the due date has passed, it's overdue again
  const pastDue = payment.due_date && new Date(payment.due_date + 'T00:00:00') < new Date()
  const nextStatus = pastDue ? 'overdue' : 'due'

  const doVoid = async () => {
    if (!reason.trim()) { setError('A reason is required for the audit trail.'); return }
    setSaving(true); setError('')
    const fields = { state: 'reversed', status: nextStatus, paid_date: null }

    if (demo) {
      onVoided?.(payment.id, fields)
      onClose(); return
    }

    const { error: e1 } = await updateTolerant('rent_payments', fields, 'id', payment.id)
    if (e1) { setError(e1.message); setSaving(false); return }
    // audit trail — best effort (table lights up once the migration runs)
    await supabase.from('payment_events').insert([{
      user_id: user.id,
      rent_payment_id: payment.id,
      lease_id: payment.lease_id || null,
      kind: 'reversed',
      amount_cents: -rowCents(payment),
      reason: reason.trim(),
    }])
    setSaving(false)
    onVoided?.(payment.id, fields)
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: VT.card, borderRadius: 18, width: '100%', maxWidth: 420, boxShadow: VT.shadowLg }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${VT.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: VT.fontDisplay, fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em' }}>Reverse payment</div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, background: VT.tint, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <VIcon.X s={14} c={VT.text2} />
          </button>
        </div>
        <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 13 }}>
          {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#b91c1c', fontWeight: 500 }}>{error}</div>}
          <p style={{ fontSize: 13, color: VT.text2, fontWeight: 500, lineHeight: 1.6, margin: 0 }}>
            Reverse the {fmtCents(rowCents(payment))} payment from {name}. The record stays for audit — it is marked reversed and the charge goes back to <strong>{nextStatus}</strong>.
          </p>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: VT.text3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, display: 'block' }}>Reason *</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. bounced check, recorded in error" style={{ width: '100%', minHeight: 64, resize: 'vertical', padding: '9px 12px', border: `1.5px solid ${VT.line}`, borderRadius: 10, background: VT.card, color: VT.text1, fontFamily: VT.fontText, fontSize: 13, fontWeight: 500, outline: 'none' }} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '10px', background: VT.tint, border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, color: VT.text2, cursor: 'pointer' }}>Cancel</button>
            <button onClick={doVoid} disabled={saving} style={{ flex: 2, padding: '10px', background: VT.redTint, border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, color: VT.red, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Reversing…' : 'Reverse payment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
