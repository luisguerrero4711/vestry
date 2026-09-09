import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { usePlan } from '../hooks/usePlan'
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

// Map UI label → DB type value (properties.type is free text; keep it in the documented set)
const TYPE_MAP = {
  'Single Family': 'single_family',
  'Duplex': 'duplex',
  'Multi-unit': 'multi_family',
  'Condo': 'condo',
  'Townhome': 'townhome',
  'Apartment': 'apartment',
  'Commercial': 'commercial',
}

const blankUnit = (n) => ({ unit_number: String(n), bedrooms: 2, bathrooms: 1, sqft: '', rent_amount: '' })

export default function AddPropertyModal({ onClose, onAdded, propertyCount = 0 }) {
  const { user } = useAuth()
  const { canAddProperty, plan } = usePlan()
  const [form, setForm] = useState({
    name: '', address: '', city: '', state: '', zip: '',
    property_type: 'Single Family', units_count: 1, market_value: '',
  })
  const [units, setUnits] = useState([blankUnit(1)])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const demo = isDemoUser(user)
  const blocked = !demo && !canAddProperty(propertyCount)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setUnit = (i, k, v) => setUnits(us => us.map((u, idx) => idx === i ? { ...u, [k]: v } : u))

  const setUnitCount = (val) => {
    const n = Math.max(1, Math.min(50, Number(val) || 1))
    set('units_count', n)
    setUnits(us => {
      if (n === us.length) return us
      if (n < us.length) return us.slice(0, n)
      return [...us, ...Array.from({ length: n - us.length }, (_, k) => blankUnit(us.length + k + 1))]
    })
  }

  const num = (v) => (v === '' || v == null ? null : Number(v))

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.name.trim() || !form.address.trim()) {
      setError('Property name and address are required.'); return
    }
    if (blocked) { setError(`Your ${plan} plan limits how many properties you can add. Upgrade to add more.`); return }
    setSaving(true); setError('')

    const unitRows = units.map((u, i) => ({
      unit_number: (u.unit_number || String(i + 1)).trim(),
      bedrooms: num(u.bedrooms),
      bathrooms: num(u.bathrooms),
      sqft: num(u.sqft),
      rent_amount: num(u.rent_amount),
    }))

    if (demo) {
      onAdded?.({
        id: `demo-${Date.now()}`, user_id: 'demo-user-id',
        name: form.name, address: form.address,
        city: form.city, state: form.state, zip: form.zip,
        type: TYPE_MAP[form.property_type] || 'single_family',
        units_count: Number(form.units_count) || 1,
        market_value: num(form.market_value),
        units: unitRows.map((u, i) => ({ id: `demo-unit-${Date.now()}-${i}`, ...u, rooms: [] })),
      })
      onClose(); return
    }

    // 1. property
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
        market_value: num(form.market_value),
      }])
      .select()
      .single()
    if (propErr) { setError(propErr.message); setSaving(false); return }

    // 2. units (one insert call, all rows)
    const { data: insertedUnits, error: unitErr } = await supabase
      .from('units')
      .insert(unitRows.map(u => ({ property_id: prop.id, ...u })))
      .select()
    if (unitErr) {
      // roll back the property so we don't leave a half-created record
      await supabase.from('properties').delete().eq('id', prop.id)
      setError(`Could not save units: ${unitErr.message}`); setSaving(false); return
    }

    onAdded?.({ ...prop, units: (insertedUnits || []).map(u => ({ ...u, rooms: [] })) })
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
        background: VT.card, borderRadius: 18, width: '100%', maxWidth: 520,
        boxShadow: VT.shadowLg, maxHeight: '92vh', overflowY: 'auto',
      }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${VT.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: VT.fontDisplay, fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em' }}>Add property</div>
            <div style={{ fontSize: 12, color: VT.text3, fontWeight: 500, marginTop: 2 }}>Add the building, then its unit(s)</div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, background: VT.tint, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <VIcon.X s={14} c={VT.text2} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 13 }}>
          {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#b91c1c', fontWeight: 500 }}>{error}</div>}
          {demo && <div style={{ background: VT.brandTint, borderRadius: 8, padding: '8px 12px', fontSize: 12, color: VT.brand, fontWeight: 500 }}>Demo mode — saved for this session only.</div>}
          {blocked && <div style={{ background: VT.amberTint, borderRadius: 8, padding: '8px 12px', fontSize: 12, color: VT.amber, fontWeight: 600 }}>Your {plan} plan has reached its property limit. Upgrade to add more.</div>}

          <div>
            <label style={lbl}>Property name *</label>
            <input style={inp} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Oak Street Duplex" required />
          </div>
          <div>
            <label style={lbl}>Street address *</label>
            <input style={inp} value={form.address} onChange={e => set('address', e.target.value)} placeholder="2406 Oak St" required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 90px', gap: 10 }}>
            <div><label style={lbl}>City</label><input style={inp} value={form.city} onChange={e => set('city', e.target.value)} placeholder="Austin" /></div>
            <div><label style={lbl}>State</label><input style={inp} value={form.state} onChange={e => set('state', e.target.value)} placeholder="TX" maxLength={2} /></div>
            <div><label style={lbl}>ZIP</label><input style={inp} value={form.zip} onChange={e => set('zip', e.target.value)} placeholder="78701" maxLength={10} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 1fr', gap: 10 }}>
            <div>
              <label style={lbl}>Property type</label>
              <select style={{ ...inp, cursor: 'pointer' }} value={form.property_type} onChange={e => set('property_type', e.target.value)}>
                {Object.keys(TYPE_MAP).map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Units</label>
              <input style={inp} type="number" min={1} max={50} value={form.units_count} onChange={e => setUnitCount(e.target.value)} />
            </div>
            <div>
              <label style={lbl}>Est. value ($)</label>
              <input style={inp} type="number" min={0} value={form.market_value} onChange={e => set('market_value', e.target.value)} placeholder="385000" />
            </div>
          </div>

          <div style={{ borderTop: `1px solid ${VT.line}`, paddingTop: 12 }}>
            <div style={{ fontSize: 11, color: VT.text3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
              Unit details
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {units.map((u, i) => (
                <div key={i} style={{ background: VT.tint, borderRadius: 10, padding: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr', gap: 8, marginBottom: 8 }}>
                    <div><label style={lbl}>Label</label><input style={inp} value={u.unit_number} onChange={e => setUnit(i, 'unit_number', e.target.value)} /></div>
                    <div><label style={lbl}>Beds</label><input style={inp} type="number" min={0} value={u.bedrooms} onChange={e => setUnit(i, 'bedrooms', e.target.value)} /></div>
                    <div><label style={lbl}>Baths</label><input style={inp} type="number" min={0} step={0.5} value={u.bathrooms} onChange={e => setUnit(i, 'bathrooms', e.target.value)} /></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div><label style={lbl}>Sq ft</label><input style={inp} type="number" min={0} value={u.sqft} onChange={e => setUnit(i, 'sqft', e.target.value)} placeholder="1200" /></div>
                    <div><label style={lbl}>Monthly rent ($)</label><input style={inp} type="number" min={0} value={u.rent_amount} onChange={e => setUnit(i, 'rent_amount', e.target.value)} placeholder="1500" /></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '10px', background: VT.tint, border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, color: VT.text2, cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={saving || blocked} style={{ flex: 2, padding: '10px', background: VT.brand, border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer', opacity: (saving || blocked) ? 0.6 : 1 }}>
              {saving ? 'Saving…' : 'Add property'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
