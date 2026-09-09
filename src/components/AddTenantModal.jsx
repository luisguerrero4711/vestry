import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { isDemoUser, demoProperties, demoUnits, demoRooms } from '../lib/demoData'
import { VT, VIcon } from '../lib/vestry-shared'

const inp = {
  width: '100%', padding: '9px 12px',
  border: `1.5px solid ${VT.line}`, borderRadius: 10,
  background: VT.card, color: VT.text1,
  fontFamily: VT.fontText, fontSize: 13, fontWeight: 500, outline: 'none',
}
const lbl = {
  fontSize: 11, fontWeight: 600, color: VT.text3,
  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, display: 'block',
}

export default function AddTenantModal({ onClose, onAdded }) {
  const { user } = useAuth()
  const demo = isDemoUser(user)
  const [properties, setProperties] = useState([])
  const [units, setUnits] = useState([])
  const [rooms, setRooms] = useState([])
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    property_id: '', unit_id: '', room_id: '',
    move_in_date: '', status: 'active', notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      if (demo) {
        setProperties(demoProperties.map(p => ({ id: p.id, name: p.name })))
        setUnits(demoUnits.map(u => ({ id: u.id, property_id: u.property_id, unit_number: u.unit_number })))
        setRooms(demoRooms.map(r => ({ id: r.id, unit_id: r.unit_id, name: r.name })))
        return
      }
      const [{ data: p }, { data: u }, { data: r }] = await Promise.all([
        supabase.from('properties').select('id, name').eq('user_id', user.id).order('name'),
        supabase.from('units').select('id, property_id, unit_number'),
        supabase.from('rooms').select('id, unit_id, name'),
      ])
      setProperties(p || []); setUnits(u || []); setRooms(r || [])
    }
    load()
  }, [user, demo])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const unitsForProp = useMemo(() => units.filter(u => u.property_id === form.property_id), [units, form.property_id])
  const roomsForUnit = useMemo(() => rooms.filter(r => r.unit_id === form.unit_id), [rooms, form.unit_id])

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.first_name.trim()) { setError('First name is required.'); return }
    setSaving(true); setError('')

    const selProp = properties.find(p => p.id === form.property_id)
    const selUnit = units.find(u => u.id === form.unit_id)
    const selRoom = rooms.find(r => r.id === form.room_id)

    const base = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      property_id: form.property_id || null,
      unit_id: form.unit_id || null,
      room_id: form.room_id || null,
      move_in_date: form.move_in_date || null,
      status: form.status,
      notes: form.notes.trim() || null,
    }

    if (demo) {
      onAdded?.({
        id: `demo-ten-${Date.now()}`, user_id: 'demo-user-id', ...base,
        properties: selProp ? { name: selProp.name } : null,
        units: selUnit ? { unit_number: selUnit.unit_number } : null,
        rooms: selRoom ? { name: selRoom.name } : null,
      })
      onClose(); return
    }

    const { data, error: err } = await supabase
      .from('tenants')
      .insert([{ user_id: user.id, ...base }])
      .select('*, properties(name), units(unit_number), rooms(name)')
      .single()
    setSaving(false)
    if (err) { setError(err.message); return }
    onAdded?.(data)
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)',
      backdropFilter: 'blur(6px)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: VT.card, borderRadius: 18, width: '100%', maxWidth: 480, boxShadow: VT.shadowLg, maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${VT.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: VT.fontDisplay, fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em' }}>Add tenant</div>
            <div style={{ fontSize: 12, color: VT.text3, fontWeight: 500, marginTop: 2 }}>Contact details and where they live</div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, background: VT.tint, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <VIcon.X s={14} c={VT.text2} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 13 }}>
          {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#b91c1c', fontWeight: 500 }}>{error}</div>}
          {demo && <div style={{ background: VT.brandTint, borderRadius: 8, padding: '8px 12px', fontSize: 12, color: VT.brand, fontWeight: 500 }}>Demo mode — saved for this session only.</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label style={lbl}>First name *</label><input style={inp} value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="Sarah" required /></div>
            <div><label style={lbl}>Last name</label><input style={inp} value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Chen" /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label style={lbl}>Email</label><input style={inp} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="sarah@email.com" /></div>
            <div><label style={lbl}>Phone</label><input style={inp} type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(512) 555-0100" /></div>
          </div>

          <div>
            <label style={lbl}>Property</label>
            <select style={{ ...inp, cursor: 'pointer' }} value={form.property_id} onChange={e => setForm(f => ({ ...f, property_id: e.target.value, unit_id: '', room_id: '' }))}>
              <option value="">— Select property —</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={lbl}>Unit</label>
              <select style={{ ...inp, cursor: 'pointer' }} value={form.unit_id} disabled={!form.property_id} onChange={e => setForm(f => ({ ...f, unit_id: e.target.value, room_id: '' }))}>
                <option value="">— None —</option>
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
            <div><label style={lbl}>Move-in date</label><input style={inp} type="date" value={form.move_in_date} onChange={e => set('move_in_date', e.target.value)} /></div>
            <div>
              <label style={lbl}>Status</label>
              <select style={{ ...inp, cursor: 'pointer' }} value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="active">Active</option>
                <option value="prospect">Prospect</option>
                <option value="past">Past tenant</option>
              </select>
            </div>
          </div>

          <div>
            <label style={lbl}>Notes</label>
            <textarea style={{ ...inp, resize: 'vertical', minHeight: 64 }} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="e.g. Always pays on time." />
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '10px', background: VT.tint, border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, color: VT.text2, cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ flex: 2, padding: '10px', background: VT.brand, border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : 'Add tenant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
