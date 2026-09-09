import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { isDemoUser } from '../lib/demoData'
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

/**
 * Add or edit a single `rooms` row within a unit.
 * props: unitId, room (existing row or null), onClose, onSaved(row)
 */
export default function RoomsEditor({ unitId, room, onClose, onSaved }) {
  const { user } = useAuth()
  const editing = !!room?.id
  const [form, setForm] = useState({
    name:         room?.name ?? '',
    monthly_rent: room?.monthly_rent ?? '',
    size_sqft:    room?.size_sqft ?? '',
    notes:        room?.notes ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const payload = () => ({
    unit_id:      unitId,
    name:         form.name.trim() || 'Room',
    monthly_rent: form.monthly_rent === '' ? null : Number(form.monthly_rent),
    size_sqft:    form.size_sqft === '' ? null : Number(form.size_sqft),
    notes:        form.notes.trim() || null,
  })

  const handleSubmit = async e => {
    e.preventDefault()
    setSaving(true); setError('')

    if (isDemoUser(user)) {
      onSaved?.({ id: room?.id || `demo-room-${Date.now()}`, ...payload() })
      onClose(); return
    }

    const q = editing
      ? supabase.from('rooms').update(payload()).eq('id', room.id).select().single()
      : supabase.from('rooms').insert([payload()]).select().single()
    const { data, error: err } = await q
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved?.(data)
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)',
      backdropFilter: 'blur(6px)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: VT.card, borderRadius: 18, width: '100%', maxWidth: 420, boxShadow: VT.shadowLg, maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${VT.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: VT.fontDisplay, fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em' }}>
            {editing ? 'Edit room' : 'Add room'}
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, background: VT.tint, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <VIcon.X s={14} c={VT.text2} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 13 }}>
          {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#b91c1c', fontWeight: 500 }}>{error}</div>}
          {isDemoUser(user) && <div style={{ background: VT.brandTint, borderRadius: 8, padding: '8px 12px', fontSize: 12, color: VT.brand, fontWeight: 500 }}>Demo mode — saved for this session only.</div>}

          <div>
            <label style={lbl}>Room name</label>
            <input style={inp} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Primary suite, Bedroom 2…" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label style={lbl}>Room rent ($)</label><input style={inp} type="number" min={0} value={form.monthly_rent} onChange={e => set('monthly_rent', e.target.value)} placeholder="700" /></div>
            <div><label style={lbl}>Size (sq ft)</label><input style={inp} type="number" min={0} value={form.size_sqft} onChange={e => set('size_sqft', e.target.value)} /></div>
          </div>
          <div>
            <label style={lbl}>Notes</label>
            <textarea style={{ ...inp, resize: 'vertical', minHeight: 56 }} value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '10px', background: VT.tint, border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, color: VT.text2, cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ flex: 2, padding: '10px', background: VT.brand, border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : editing ? 'Save room' : 'Add room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
