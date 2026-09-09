import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { isDemoUser, demoProperties, demoUnits, demoRooms, demoTenants } from '../lib/demoData'
import { VT, VIcon } from '../lib/vestry-shared'

const inp = {
  width: '100%', padding: '9px 12px', border: `1.5px solid ${VT.line}`, borderRadius: 10,
  background: VT.card, color: VT.text1, fontFamily: VT.fontText, fontSize: 13, fontWeight: 500, outline: 'none',
}
const lbl = { fontSize: 11, fontWeight: 600, color: VT.text3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, display: 'block' }

/** props: onClose, onAdded(row), initialPropertyId */
export default function NewRequestModal({ onClose, onAdded, initialPropertyId }) {
  const { user } = useAuth()
  const demo = isDemoUser(user)
  const [properties, setProperties] = useState([])
  const [units, setUnits] = useState([])
  const [rooms, setRooms] = useState([])
  const [tenants, setTenants] = useState([])
  const [form, setForm] = useState({
    property_id: initialPropertyId || '', unit_id: '', room_id: '', tenant_id: '',
    title: '', description: '', priority: 'normal',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    async function load() {
      if (demo) {
        setProperties(demoProperties.map(p => ({ id: p.id, name: p.name })))
        setUnits(demoUnits.map(u => ({ id: u.id, property_id: u.property_id, unit_number: u.unit_number })))
        setRooms(demoRooms.map(r => ({ id: r.id, unit_id: r.unit_id, name: r.name })))
        setTenants(demoTenants.map(t => ({ id: t.id, property_id: t.property_id, first_name: t.first_name, last_name: t.last_name })))
        return
      }
      const [{ data: p }, { data: u }, { data: r }, { data: t }] = await Promise.all([
        supabase.from('properties').select('id, name').eq('user_id', user.id).order('name'),
        supabase.from('units').select('id, property_id, unit_number'),
        supabase.from('rooms').select('id, unit_id, name'),
        supabase.from('tenants').select('id, property_id, first_name, last_name').eq('user_id', user.id),
      ])
      setProperties(p || []); setUnits(u || []); setRooms(r || []); setTenants(t || [])
    }
    load()
  }, [user, demo])

  const unitsForProp = useMemo(() => units.filter(u => u.property_id === form.property_id), [units, form.property_id])
  const roomsForUnit = useMemo(() => rooms.filter(r => r.unit_id === form.unit_id), [rooms, form.unit_id])
  const tenantsForProp = useMemo(() => tenants.filter(t => t.property_id === form.property_id), [tenants, form.property_id])

  const submit = async e => {
    e.preventDefault()
    if (!form.property_id || !form.title.trim()) { setError('Property and a short title are required.'); return }
    setSaving(true); setError('')
    const base = {
      property_id: form.property_id,
      unit_id: form.unit_id || null,
      room_id: form.room_id || null,
      tenant_id: form.tenant_id || null,
      title: form.title.trim(),
      description: form.description.trim() || null,
      priority: form.priority,
      status: 'new',
    }
    if (demo) {
      const p = properties.find(x => x.id === form.property_id)
      const u = units.find(x => x.id === form.unit_id)
      const t = tenants.find(x => x.id === form.tenant_id)
      onAdded?.({
        id: `mr-${Date.now()}`, user_id: 'demo-user-id', ...base, cost_cents: null, created_at: new Date().toISOString().slice(0, 10),
        properties: p ? { name: p.name } : null,
        units: u ? { unit_number: u.unit_number } : null,
        tenants: t ? { first_name: t.first_name, last_name: t.last_name } : null,
      })
      onClose(); return
    }
    const { data, error: err } = await supabase.from('maintenance_requests')
      .insert([{ user_id: user.id, ...base }])
      .select('*, properties(name), units(unit_number), tenants(first_name, last_name)').single()
    setSaving(false)
    if (err) { setError(err.message); return }
    onAdded?.(data)
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: VT.card, borderRadius: 18, width: '100%', maxWidth: 480, boxShadow: VT.shadowLg, maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${VT.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: VT.fontDisplay, fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em' }}>New maintenance request</div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, background: VT.tint, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <VIcon.X s={14} c={VT.text2} />
          </button>
        </div>
        <form onSubmit={submit} style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 13 }}>
          {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#b91c1c', fontWeight: 500 }}>{error}</div>}
          {demo && <div style={{ background: VT.brandTint, borderRadius: 8, padding: '8px 12px', fontSize: 12, color: VT.brand, fontWeight: 500 }}>Demo mode — saved for this session only.</div>}
          <div>
            <label style={lbl}>Property *</label>
            <select style={{ ...inp, cursor: 'pointer' }} value={form.property_id} onChange={e => setForm(f => ({ ...f, property_id: e.target.value, unit_id: '', room_id: '', tenant_id: '' }))}>
              <option value="">— Select property —</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={lbl}>Unit / area</label>
              <select style={{ ...inp, cursor: 'pointer' }} value={form.unit_id} disabled={!form.property_id} onChange={e => setForm(f => ({ ...f, unit_id: e.target.value, room_id: '' }))}>
                <option value="">Shared / common area</option>
                {unitsForProp.map(u => <option key={u.id} value={u.id}>Unit {u.unit_number}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Room</label>
              <select style={{ ...inp, cursor: 'pointer' }} value={form.room_id} disabled={!form.unit_id || roomsForUnit.length === 0} onChange={e => set('room_id', e.target.value)}>
                <option value="">— None —</option>
                {roomsForUnit.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={lbl}>Reported by</label>
              <select style={{ ...inp, cursor: 'pointer' }} value={form.tenant_id} disabled={!form.property_id} onChange={e => set('tenant_id', e.target.value)}>
                <option value="">— Not a tenant —</option>
                {tenantsForProp.map(t => <option key={t.id} value={t.id}>{`${t.first_name} ${t.last_name}`.trim()}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Priority</label>
              <select style={{ ...inp, cursor: 'pointer' }} value={form.priority} onChange={e => set('priority', e.target.value)}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div>
            <label style={lbl}>Title *</label>
            <input style={inp} value={form.title} onChange={e => set('title', e.target.value)} placeholder="Leaking kitchen sink" required />
          </div>
          <div>
            <label style={lbl}>Description</label>
            <textarea style={{ ...inp, resize: 'vertical', minHeight: 64 }} value={form.description} onChange={e => set('description', e.target.value)} placeholder="What's happening, and since when?" />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '10px', background: VT.tint, border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, color: VT.text2, cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ flex: 2, padding: '10px', background: VT.brand, border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : 'Create request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
