import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { isDemoUser } from '../lib/demoData'
import { VT, VIcon } from '../lib/vestry-shared'

const inp = {
  width: '100%', padding: '9px 12px',
  border: `1.5px solid ${VT.line}`, borderRadius: 10,
  background: VT.card, color: VT.text1,
  fontFamily: VT.fontText, fontSize: 13, fontWeight: 500,
  outline: 'none',
}
const lbl = {
  fontSize: 11, fontWeight: 600, color: VT.text3,
  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, display: 'block',
}

// Map UI label → DB type value
const TYPE_MAP = {
  'Duplex': 'multi_family',
  'Single Family': 'single_family',
  'Condo': 'condo',
  'Apartment': 'multi_family',
  'Townhome': 'townhouse',
  'Multi-unit': 'multi_family',
  'Commercial': 'commercial',
}

export default function AddPropertyModal({ onClose, onAdded }) {
  const { user } = useAuth()
  const [form, setForm] = useState({
    name: '', address: '', city: '', state: '', zip: '',
    property_type: 'Single Family',
    units_count: 1, bedrooms: 2, bathrooms: 1, square_feet: '', monthly_rent: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.name.trim() || !form.address.trim()) {
      setError('Property name and address are required.'); return
    }
    setSaving(true); setError('')

    if (isDemoUser(user)) {
      // Demo: return a shape matching demoProperties
      onAdded?.({
        id: `demo-${Date.now()}`, user_id: 'demo-user-id',
        name: form.name, address: form.address,
        city: form.city, state: form.state,
        type: TYPE_MAP[form.property_type] || 'single_family',
        units_count: Number(form.units_count) || 1,
        // Attach fake first-unit so Properties.jsx can read it
        units: [{
          bedrooms: Number(form.bedrooms) || 2,
          bathrooms: Number(form.bathrooms) || 1,
          sqft: Number(form.square_feet) || 0,
          rent_amount: Number(form.monthly_rent) || 0,
        }],
      })
      onClose(); return
    }

    // --- Real Supabase path ---
    // 1. Insert property (using correct column names from schema)
    const { data: prop, error: propErr } = await supabase
      .from('properties')
      .insert([{
        user_id: user.id,
        name: form.name.trim(),
        address: form.address.trim(),
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        zip: form.zip.trim() || null,
        type: TYPE_MAP[form.property_type] || 'single_family',
        units_count: Number(form.units_count) || 1,
      }])
      .select()
      .single()

    if (propErr) { setError(propErr.message); setSaving(false); return }

    // 2. Create a default unit with rental details
    const unitPayload = {
      property_id: prop.id,
      unit_number: Number(form.units_count) > 1 ? 'Unit 1' : '1',
      bedrooms: Number(form.bedrooms) || null,
      bathrooms: Number(form.bathrooms) || null,
      sqft: Number(form.square_feet) || null,
      rent_amount: Number(form.monthly_rent) || null,
    }
    const { data: unit } = await supabase.from('units').insert([unitPayload]).select().single()

    // Return combined object so Properties page can display it immediately
    onAdded?.({ ...prop, units: unit ? [unit] : [] })
    setSaving(false)
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)',
      backdropFilter: 'blur(6px)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: VT.card, borderRadius: 18, width: '100%', maxWidth: 500,
        boxShadow: VT.shadowLg, maxHeight: '92vh', overflowY: 'auto',
      }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${VT.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: VT.fontDisplay, fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em' }}>Add property</div>
            <div style={{ fontSize: 12, color: VT.text3, fontWeight: 500, marginTop: 2 }}>Your property will be saved to your portfolio</div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, background: VT.tint, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <VIcon.X s={14} c={VT.text2} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 13 }}>
          {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#b91c1c', fontWeight: 500 }}>{error}</div>}
          {isDemoUser(user) && <div style={{ background: VT.brandTint, borderRadius: 8, padding: '8px 12px', fontSize: 12, color: VT.brand, fontWeight: 500 }}>Demo mode — saved for this session only.</div>}

          <div>
            <label style={lbl}>Property name *</label>
            <input style={inp} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Oak Street Duplex" required />
          </div>

          <div>
            <label style={lbl}>Street address *</label>
            <input style={inp} value={form.address} onChange={e => set('address', e.target.value)} placeholder="2406 Oak St" required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 90px', gap: 10 }}>
            <div>
              <label style={lbl}>City</label>
              <input style={inp} value={form.city} onChange={e => set('city', e.target.value)} placeholder="Austin" />
            </div>
            <div>
              <label style={lbl}>State</label>
              <input style={inp} value={form.state} onChange={e => set('state', e.target.value)} placeholder="TX" maxLength={2} />
            </div>
            <div>
              <label style={lbl}>ZIP</label>
              <input style={inp} value={form.zip} onChange={e => set('zip', e.target.value)} placeholder="78701" maxLength={10} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={lbl}>Property type</label>
              <select style={{ ...inp, cursor: 'pointer' }} value={form.property_type} onChange={e => set('property_type', e.target.value)}>
                {['Single Family', 'Duplex', 'Multi-unit', 'Condo', 'Townhome', 'Apartment', 'Commercial'].map(t => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={lbl}>Total units</label>
              <input style={inp} type="number" min={1} value={form.units_count} onChange={e => set('units_count', e.target.value)} />
            </div>
          </div>

          <div style={{ borderTop: `1px solid ${VT.line}`, paddingTop: 12 }}>
            <div style={{ fontSize: 11, color: VT.text3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Unit details (first / only unit)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={lbl}>Beds</label>
                <input style={inp} type="number" min={0} value={form.bedrooms} onChange={e => set('bedrooms', e.target.value)} />
              </div>
              <div>
                <label style={lbl}>Baths</label>
                <input style={inp} type="number" min={0} step={0.5} value={form.bathrooms} onChange={e => set('bathrooms', e.target.value)} />
              </div>
              <div>
                <label style={lbl}>Sq ft</label>
                <input style={inp} type="number" min={0} value={form.square_feet} onChange={e => set('square_feet', e.target.value)} placeholder="1200" />
              </div>
            </div>
            <div>
              <label style={lbl}>Monthly rent ($)</label>
              <input style={inp} type="number" min={0} value={form.monthly_rent} onChange={e => set('monthly_rent', e.target.value)} placeholder="1500" />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '10px', background: VT.tint, border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, color: VT.text2, cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ flex: 2, padding: '10px', background: VT.brand, border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : 'Add property'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
