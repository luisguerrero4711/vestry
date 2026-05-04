import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { isDemoUser } from '../lib/demoData'
import { VT, VIcon } from '../lib/vestry-shared'

const inputStyle = {
  width: '100%', padding: '9px 12px',
  border: `1.5px solid ${VT.line}`, borderRadius: 10,
  background: VT.card, color: VT.text1,
  fontFamily: VT.fontText, fontSize: 13, fontWeight: 500,
  outline: 'none', transition: 'border-color 0.15s',
}

const labelStyle = {
  fontSize: 11, fontWeight: 600, color: VT.text3,
  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, display: 'block',
}

export default function RecordPaymentModal({ onClose, onAdded }) {
  const { user } = useAuth()
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    tenant_name: '', property_name: '',
    amount: '', payment_date: today,
    payment_method: 'Bank transfer',
    status: 'received', notes: '',
    reference_number: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.amount || isNaN(Number(form.amount))) { setError('Please enter a valid amount.'); return }
    setSaving(true)
    setError('')

    const row = {
      tenant_name: form.tenant_name,
      property_name: form.property_name,
      amount: Number(form.amount),
      payment_date: form.payment_date,
      payment_method: form.payment_method,
      status: form.status,
      notes: form.notes,
      reference_number: form.reference_number,
    }

    if (isDemoUser(user)) {
      const d = new Date(form.payment_date)
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      onAdded?.({
        id: Date.now(),
        d: label,
        init: (form.tenant_name || 'T').slice(0, 2).toUpperCase(),
        color: '#60A5FA',
        name: form.tenant_name || 'Tenant',
        prop: form.property_name || '—',
        amt: `+$${Number(form.amount).toLocaleString()}`,
        method: form.payment_method,
        ref: form.reference_number || '—',
        status: form.status === 'received' ? 'success' : form.status === 'pending' ? 'warn' : 'danger',
        label: form.status === 'received' ? 'Received' : form.status === 'pending' ? 'Pending' : 'Overdue',
      })
      onClose()
      return
    }

    const { data, error: err } = await supabase.from('payments').insert([{
      user_id: user.id, ...row,
    }]).select().single()

    setSaving(false)
    if (err) { setError(err.message); return }
    onAdded?.(data)
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)',
      backdropFilter: 'blur(6px)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: VT.card, borderRadius: 18, width: '100%', maxWidth: 460,
        boxShadow: VT.shadowLg, overflow: 'hidden', maxHeight: '90vh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${VT.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: VT.fontDisplay, fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em' }}>Record payment</div>
            <div style={{ fontSize: 12, color: VT.text3, fontWeight: 500, marginTop: 2 }}>Log an incoming or outgoing payment</div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, background: VT.tint, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <VIcon.X s={14} c={VT.text2} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#b91c1c', fontWeight: 500 }}>{error}</div>
          )}

          {isDemoUser(user) && (
            <div style={{ background: VT.brandTint, border: `1px solid ${VT.brand}22`, borderRadius: 8, padding: '8px 12px', fontSize: 12, color: VT.brand, fontWeight: 500 }}>
              Demo mode — payment will appear for this session only.
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Amount *</label>
              <input style={inputStyle} type="number" min={0} step={0.01} value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="1500.00" />
            </div>
            <div>
              <label style={labelStyle}>Date</label>
              <input style={inputStyle} type="date" value={form.payment_date} onChange={e => set('payment_date', e.target.value)} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Tenant / counterparty</label>
            <input style={inputStyle} value={form.tenant_name} onChange={e => set('tenant_name', e.target.value)} placeholder="Sarah Chen" />
          </div>

          <div>
            <label style={labelStyle}>Property</label>
            <input style={inputStyle} value={form.property_name} onChange={e => set('property_name', e.target.value)} placeholder="Oak Street Duplex · Unit A" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Payment method</label>
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.payment_method} onChange={e => set('payment_method', e.target.value)}>
                {['Bank transfer', 'Check', 'Cash', 'Card', 'Venmo', 'Zelle', 'Other'].map(m => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="received">Received</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Reference # (optional)</label>
            <input style={inputStyle} value={form.reference_number} onChange={e => set('reference_number', e.target.value)} placeholder="ACH-1234" />
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: '9px', background: VT.tint, border: 'none',
              borderRadius: 10, fontSize: 13, fontWeight: 600, color: VT.text2, cursor: 'pointer',
            }}>Cancel</button>
            <button type="submit" disabled={saving} style={{
              flex: 2, padding: '9px', background: VT.brand, border: 'none',
              borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer',
              opacity: saving ? 0.6 : 1,
            }}>{saving ? 'Saving…' : 'Record payment'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
