import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import {
  isDemoUser, demoProperties, demoUnits, demoRooms, demoLeases, demoPayments,
} from '../lib/demoData'
import { VT, VIcon, VPill, VAvatar } from '../lib/vestry-shared'

const money = (n) => `$${Number(n || 0).toLocaleString()}`
const initials = (s = '') => s.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

const sel = {
  width: '100%', padding: '8px 10px', border: `1px solid ${VT.line}`, borderRadius: 8,
  background: VT.card, color: VT.text1, fontFamily: VT.fontText, fontSize: 13, fontWeight: 500,
  outline: 'none', cursor: 'pointer',
}
const lbl = { fontSize: 11, fontWeight: 600, color: VT.text3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, display: 'block' }

/** props: tenant, onClose, onSaved(updatedRow) */
export default function TenantDetailDrawer({ tenant, onClose, onSaved }) {
  const { user } = useAuth()
  const demo = isDemoUser(user)
  const [properties, setProperties] = useState([])
  const [units, setUnits] = useState([])
  const [rooms, setRooms] = useState([])
  const [lease, setLease] = useState(null)
  const [payments, setPayments] = useState([])
  const [form, setForm] = useState({
    property_id: tenant.property_id || '',
    unit_id: tenant.unit_id || '',
    room_id: tenant.room_id || '',
    status: tenant.status || 'active',
  })
  const [saving, setSaving] = useState(false)

  const name = `${tenant.first_name || ''} ${tenant.last_name || ''}`.trim()

  useEffect(() => {
    async function load() {
      if (demo) {
        setProperties(demoProperties.map(p => ({ id: p.id, name: p.name })))
        setUnits(demoUnits.map(u => ({ id: u.id, property_id: u.property_id, unit_number: u.unit_number })))
        setRooms(demoRooms.map(r => ({ id: r.id, unit_id: r.unit_id, name: r.name })))
        setLease(demoLeases.find(l => l.tenant_id === tenant.id && l.status === 'active') || null)
        setPayments(demoPayments.filter(p => p.tenant_id === tenant.id))
        return
      }
      const [{ data: p }, { data: u }, { data: r }, { data: l }, { data: pays }] = await Promise.all([
        supabase.from('properties').select('id, name').eq('user_id', user.id).order('name'),
        supabase.from('units').select('id, property_id, unit_number'),
        supabase.from('rooms').select('id, unit_id, name'),
        supabase.from('leases').select('id, monthly_rent, end_date, status').eq('tenant_id', tenant.id).eq('status', 'active').maybeSingle(),
        supabase.from('rent_payments').select('*').eq('tenant_id', tenant.id).order('due_date', { ascending: false }).limit(6),
      ])
      setProperties(p || []); setUnits(u || []); setRooms(r || [])
      setLease(l || null); setPayments(pays || [])
    }
    load()
  }, [tenant.id, user, demo])

  const unitsForProp = useMemo(() => units.filter(u => u.property_id === form.property_id), [units, form.property_id])
  const roomsForUnit = useMemo(() => rooms.filter(r => r.unit_id === form.unit_id), [rooms, form.unit_id])

  const save = async () => {
    setSaving(true)
    const patch = {
      property_id: form.property_id || null,
      unit_id: form.unit_id || null,
      room_id: form.room_id || null,
      status: form.status,
    }
    if (demo) {
      const p = properties.find(x => x.id === patch.property_id)
      const u = units.find(x => x.id === patch.unit_id)
      const r = rooms.find(x => x.id === patch.room_id)
      onSaved?.({ id: tenant.id, ...patch, properties: p ? { name: p.name } : null, units: u ? { unit_number: u.unit_number } : null, rooms: r ? { name: r.name } : null })
      setSaving(false); onClose(); return
    }
    const { data, error } = await supabase
      .from('tenants').update(patch).eq('id', tenant.id)
      .select('*, properties(name), units(unit_number), rooms(name)').single()
    setSaving(false)
    if (!error) { onSaved?.(data); onClose() }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 420, background: VT.page, height: '100%', overflowY: 'auto', boxShadow: VT.shadowLg }}>
        <div style={{ padding: '18px 20px', borderBottom: `1px solid ${VT.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: VT.card }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <VAvatar initials={initials(name)} size={38} />
            <div>
              <div style={{ fontFamily: VT.fontDisplay, fontSize: 16, fontWeight: 600, letterSpacing: '-0.02em' }}>{name}</div>
              <div style={{ fontSize: 12, color: VT.text3, fontWeight: 500 }}>{(tenant.status || 'active')[0].toUpperCase() + (tenant.status || 'active').slice(1)} tenant</div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, background: VT.tint, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <VIcon.X s={14} c={VT.text2} />
          </button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* contact */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: VT.text2, fontWeight: 500 }}><VIcon.Mail s={13} /> {tenant.email || '—'}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: VT.text2, fontWeight: 500 }}><VIcon.Phone s={13} /> {tenant.phone || '—'}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: VT.text2, fontWeight: 500 }}><VIcon.Calendar s={13} /> Moved in {fmtDate(tenant.move_in_date)}</div>
          </div>

          {/* placement editor */}
          <div style={{ background: VT.card, border: `1px solid ${VT.line}`, borderRadius: 'var(--r-sm)', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: VT.text2 }}>Placement</div>
            <div>
              <label style={lbl}>Property</label>
              <select style={sel} value={form.property_id} onChange={e => setForm(f => ({ ...f, property_id: e.target.value, unit_id: '', room_id: '' }))}>
                <option value="">— None —</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label style={lbl}>Unit</label>
                <select style={sel} value={form.unit_id} disabled={!form.property_id} onChange={e => setForm(f => ({ ...f, unit_id: e.target.value, room_id: '' }))}>
                  <option value="">— None —</option>
                  {unitsForProp.map(u => <option key={u.id} value={u.id}>Unit {u.unit_number}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Room</label>
                <select style={sel} value={form.room_id} disabled={!form.unit_id || roomsForUnit.length === 0} onChange={e => setForm(f => ({ ...f, room_id: e.target.value }))}>
                  <option value="">— None —</option>
                  {roomsForUnit.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={lbl}>Status</label>
              <select style={sel} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="active">Active</option>
                <option value="prospect">Prospect</option>
                <option value="past">Past</option>
              </select>
            </div>
            <button onClick={save} disabled={saving} style={{ padding: '9px', background: VT.brand, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : 'Save placement'}
            </button>
          </div>

          {/* active lease */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: VT.text2, marginBottom: 8 }}>Active lease</div>
            {lease ? (
              <Link to={`/leases/${lease.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 12px', background: VT.card, border: `1px solid ${VT.line}`, borderRadius: 'var(--r-sm)', textDecoration: 'none' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: VT.text1 }}>{money(lease.monthly_rent)}/mo</div>
                  <div style={{ fontSize: 11, color: VT.text3, fontWeight: 500 }}>Ends {fmtDate(lease.end_date)}</div>
                </div>
                <VIcon.Chevron s={14} c="var(--text-3)" />
              </Link>
            ) : (
              <div style={{ fontSize: 13, color: VT.text3, fontWeight: 500 }}>No active lease.</div>
            )}
          </div>

          {/* payments */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: VT.text2, marginBottom: 8 }}>Recent payments</div>
            {payments.length === 0 ? (
              <div style={{ fontSize: 13, color: VT.text3, fontWeight: 500 }}>None recorded.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {payments.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 0', borderTop: `1px solid ${VT.line}` }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{money(p.amount)}</div>
                      <div style={{ fontSize: 11, color: VT.text3, fontWeight: 500 }}>Due {fmtDate(p.due_date)}</div>
                    </div>
                    <VPill tone={p.status === 'paid' ? 'success' : p.status === 'overdue' ? 'danger' : 'warn'}>
                      {(p.status || 'due')[0].toUpperCase() + (p.status || 'due').slice(1)}
                    </VPill>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
