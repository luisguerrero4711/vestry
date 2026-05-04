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

export default function AddTenantModal({ onClose, onAdded }) {
  const { user } = useAuth()
  const [form, setForm] = useState({
    name: '', email: '', phone: '', property: '',
    monthly_rent: '', move_in_date: '', status: 'active',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.name) { setError('Tenant name is required.'); return }
    setSaving(true)
    setError('')

    if (isDemoUser(user)) {
      onAdded?.({
        id: Date.now(), ...form,
        rent: Number(form.monthly_rent) || 0,
        onTime: 100,
      })
      onClose()
      return
    }

    const { data, error: err } = await supabase.from('tenants').insert([{
      user_id: user.id,
      name: form.name,
      email: form.email,
      phone: form.phone,
      property_name: form.property,
      monthly_rent: Number(form.monthly_rent) || 0,
      move_in_date: form.move_in_date || null,
      status: form.status,
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
        background: VT.card, borderRadius: 18, width: '100%', maxWidth: 480,
        boxShadow: VT.shadowLg, overflow: 'hidden', maxHeight: '90vh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${VT.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: VT.fontDisplay, fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em' }}>Add tenant</div>
            <div style={{ fontSize: 12, color: VT.text3, fontWeight: 500, marginTop: 2 }}>Enter tenant contact details</div>
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
              Demo mode — tenant will be added for this session only.
            </div>
          )}

          <div>
            <label style={labelStyle}>Full name *</label>
            <input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Jane Smith" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Email</label>
              <input style={inputStyle} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="jane@email.com" />
            </div>
            <div>
              <label style={labelStyle}>Phone</label>
              <input style={inputStyle} type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(503) 555-0100" />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Property / unit</label>
            <input style={inputStyle} value={form.property} onChange={e => set('property', e.target.value)} placeholder="Oak Street Duplex · Unit A" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Monthly rent ($)</label>
              <input style={inputStyle} type="number" min={0} value={form.monthly_rent} onChange={e => set('monthly_rent', e.target.value)} placeholder="1500" />
            </div>
            <div>
              <label style={labelStyle}>Move-in date</label>
              <input style={inputStyle} type="date" value={form.move_in_date} onChange={e => set('move_in_date', e.target.value)} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Status</label>
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
            </select>
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
            }}>{saving ? 'Saving…' : 'Add tenant'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
