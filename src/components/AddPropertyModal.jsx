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

export default function AddPropertyModal({ onClose, onAdded }) {
  const { user } = useAuth()
  const [form, setForm] = useState({
    name: '', address: '', city: '', state: '', property_type: 'Duplex',
    units: 1, bedrooms: 2, bathrooms: 1, square_feet: '', monthly_rent: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.name || !form.address) { setError('Name and address are required.'); return }
    setSaving(true)
    setError('')

    if (isDemoUser(user)) {
      // Demo: add locally only
      onAdded?.({
        id: Date.now(), ...form,
        monthly_rent: Number(form.monthly_rent) || 0,
        units: Number(form.units) || 1,
        occupied_units: Number(form.units) || 1,
        bedrooms: Number(form.bedrooms) || 2,
        bathrooms: Number(form.bathrooms) || 1,
        square_feet: Number(form.square_feet) || 0,
      })
      onClose()
      return
    }

    const { data, error: err } = await supabase.from('properties').insert([{
      user_id: user.id,
      name: form.name,
      address: form.address,
      city: form.city,
      state: form.state,
      property_type: form.property_type,
      units: Number(form.units) || 1,
      bedrooms: Number(form.bedrooms) || 2,
      bathrooms: Number(form.bathrooms) || 1,
      square_feet: Number(form.square_feet) || null,
      monthly_rent: Number(form.monthly_rent) || 0,
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
        background: VT.card, borderRadius: 18, width: '100%', maxWidth: 500,
        boxShadow: VT.shadowLg, overflow: 'hidden', maxHeight: '90vh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${VT.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: VT.fontDisplay, fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em' }}>Add property</div>
            <div style={{ fontSize: 12, color: VT.text3, fontWeight: 500, marginTop: 2 }}>Enter property details below</div>
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
              Demo mode — property will be added for this session only.
            </div>
          )}

          <div>
            <label style={labelStyle}>Property name *</label>
            <input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Oak Street Duplex" />
          </div>

          <div>
            <label style={labelStyle}>Street address *</label>
            <input style={inputStyle} value={form.address} onChange={e => set('address', e.target.value)} placeholder="418 Oak St" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 10 }}>
            <div>
              <label style={labelStyle}>City</label>
              <input style={inputStyle} value={form.city} onChange={e => set('city', e.target.value)} placeholder="Portland" />
            </div>
            <div>
              <label style={labelStyle}>State</label>
              <input style={inputStyle} value={form.state} onChange={e => set('state', e.target.value)} placeholder="OR" maxLength={2} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Property type</label>
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.property_type} onChange={e => set('property_type', e.target.value)}>
                {['Duplex', 'Single Family', 'Condo', 'Apartment', 'Townhome', 'Multi-unit', 'Commercial'].map(t => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Total units</label>
              <input style={inputStyle} type="number" min={1} value={form.units} onChange={e => set('units', e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Beds</label>
              <input style={inputStyle} type="number" min={0} value={form.bedrooms} onChange={e => set('bedrooms', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Baths</label>
              <input style={inputStyle} type="number" min={0} step={0.5} value={form.bathrooms} onChange={e => set('bathrooms', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Sq ft</label>
              <input style={inputStyle} type="number" min={0} value={form.square_feet} onChange={e => set('square_feet', e.target.value)} placeholder="1200" />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Monthly rent ($)</label>
            <input style={inputStyle} type="number" min={0} value={form.monthly_rent} onChange={e => set('monthly_rent', e.target.value)} placeholder="1500" />
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: '9px', background: VT.tint, border: 'none',
              borderRadius: 10, fontSize: 13, fontWeight: 600, color: VT.text2, cursor: 'pointer',
            }}>Cancel</button>
            <button type="submit" disabled={saving} style={{
              flex: 2, padding: '9px', background: VT.brand, border: 'none',
              borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer',
              opacity: saving ? 0.6 : 1,
            }}>{saving ? 'Saving…' : 'Add property'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
