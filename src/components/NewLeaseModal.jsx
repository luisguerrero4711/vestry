import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { insertTolerant } from '../lib/db'
import { useAuth } from '../hooks/useAuth'
import { isDemoUser, demoProperties, demoTenants, demoLeases } from '../lib/demoData'
import { toCents } from '../lib/money'
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
const plusYear = (d) => {
  if (!d) return ''
  const dt = new Date(d); dt.setFullYear(dt.getFullYear() + 1); dt.setDate(dt.getDate() - 1)
  return dt.toISOString().slice(0, 10)
}

/** props: initialUnitId, onClose, onAdded(row) */
export default function NewLeaseModal({ initialUnitId, onClose, onAdded }) {
  const { user } = useAuth()
  const demo = isDemoUser(user)
  const [properties, setProperties] = useState([])
  const [units, setUnits] = useState([])
  const [tenants, setTenants] = useState([])
  const [activeLeases, setActiveLeases] = useState([])
  const [form, setForm] = useState({
    property_id: '', unit_id: initialUnitId || '', tenant_id: '',
    start_date: '', end_date: '', monthly_rent: '', security_deposit: '',
    opening_balance: '', opening_balance_date: '', notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    async function load() {
      if (demo) {
        setProperties(demoProperties.map(p => ({ id: p.id, name: p.name })))
        setUnits(demoProperties.flatMap(p => (p.units || []).map(u => ({ id: u.id, property_id: p.id, unit_number: u.unit_number, rent_amount: u.rent_amount }))))
        setTenants(demoTenants.map(t => ({ id: t.id, first_name: t.first_name, last_name: t.last_name })))
        setActiveLeases(demoLeases.filter(l => (l.status ?? 'active') === 'active'))
        return
      }
      const [{ data: p }, { data: u }, { data: t }, { data: al }] = await Promise.all([
        supabase.from('properties').select('id, name').eq('user_id', user.id).order('name'),
        supabase.from('units').select('id, property_id, unit_number, rent_amount'),
        supabase.from('tenants').select('id, first_name, last_name').eq('user_id', user.id).order('first_name'),
        supabase.from('leases').select('id, unit_id, tenants(first_name,last_name)').eq('user_id', user.id).eq('status', 'active'),
      ])
      setProperties(p || []); setUnits(u || []); setTenants(t || []); setActiveLeases(al || [])
    }
    load()
  }, [user, demo])

  const unitsForProp = useMemo(
    () => units.filter(u => !form.property_id || u.property_id === form.property_id),
    [units, form.property_id]
  )

  // when unit picked, prefill rent + property
  const pickUnit = (unitId) => {
    const u = units.find(x => x.id === unitId)
    setForm(f => ({
      ...f,
      unit_id: unitId,
      property_id: u?.property_id || f.property_id,
      monthly_rent: f.monthly_rent || (u?.rent_amount ?? ''),
    }))
  }

  // an active lease already on this unit? (server also enforces this)
  const unitConflict = useMemo(() => {
    if (!form.unit_id) return null
    return activeLeases.find(l => l.unit_id === form.unit_id) || null
  }, [activeLeases, form.unit_id])

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.property_id || !form.tenant_id || !form.start_date || !form.monthly_rent) {
      setError('Property, tenant, start date and rent are required.'); return
    }
    if (unitConflict) {
      const who = unitConflict.tenants ? `${unitConflict.tenants.first_name} ${unitConflict.tenants.last_name}`.trim() : 'another tenant'
      setError(`That unit already has an active lease with ${who}. End it first, or pick another unit.`)
      return
    }
    setSaving(true); setError('')

    const base = {
      property_id: form.property_id,
      unit_id: form.unit_id || null,
      tenant_id: form.tenant_id,
      start_date: form.start_date,
      end_date: form.end_date || plusYear(form.start_date),
      monthly_rent: Number(form.monthly_rent),
      security_deposit: form.security_deposit === '' ? null : Number(form.security_deposit),
      opening_balance_cents: form.opening_balance === '' ? 0 : toCents(form.opening_balance),
      opening_balance_date: form.opening_balance_date || null,
      status: 'active',
      notes: form.notes.trim() || null,
    }

    if (demo) {
      const t = tenants.find(x => x.id === form.tenant_id)
      const p = properties.find(x => x.id === form.property_id)
      const u = units.find(x => x.id === form.unit_id)
      onAdded?.({
        id: `demo-lease-${Date.now()}`, user_id: 'demo-user-id', ...base,
        tenants: t ? { first_name: t.first_name, last_name: t.last_name } : null,
        properties: p ? { name: p.name } : null,
        units: u ? { unit_number: u.unit_number } : null,
      })
      onClose(); return
    }

    const { data: ins, error: err } = await insertTolerant(
      'leases', { user_id: user.id, ...base },
      '*, tenants(first_name, last_name), properties(name), units(unit_number)'
    )
    setSaving(false)
    if (err) {
      setError(/already has an active lease/i.test(err.message)
        ? 'That unit already has an active lease. End it first, or pick another unit.'
        : err.message)
      return
    }
    const data = Array.isArray(ins) ? ins[0] : ins

    // keep the tenant's placement in sync with the lease
    if (form.unit_id) {
      await supabase.from('tenants')
        .update({ property_id: form.property_id, unit_id: form.unit_id })
        .eq('id', form.tenant_id)
    }
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
          <div style={{ fontFamily: VT.fontDisplay, fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em' }}>New lease</div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, background: VT.tint, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <VIcon.X s={14} c={VT.text2} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 13 }}>
          {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#b91c1c', fontWeight: 500 }}>{error}</div>}
          {demo && <div style={{ background: VT.brandTint, borderRadius: 8, padding: '8px 12px', fontSize: 12, color: VT.brand, fontWeight: 500 }}>Demo mode — saved for this session only.</div>}

          <div>
            <label style={lbl}>Property *</label>
            <select style={{ ...inp, cursor: 'pointer' }} value={form.property_id} onChange={e => set('property_id', e.target.value)}>
              <option value="">— Select property —</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Unit</label>
            <select style={{ ...inp, cursor: 'pointer' }} value={form.unit_id} onChange={e => pickUnit(e.target.value)}>
              <option value="">— Whole property / no unit —</option>
              {unitsForProp.map(u => <option key={u.id} value={u.id}>Unit {u.unit_number}</option>)}
            </select>
            {unitConflict && (
              <div style={{ fontSize: 12, color: VT.amber, fontWeight: 600, marginTop: 6 }}>
                This unit already has an active lease.
              </div>
            )}
          </div>
          <div>
            <label style={lbl}>Tenant *</label>
            <select style={{ ...inp, cursor: 'pointer' }} value={form.tenant_id} onChange={e => set('tenant_id', e.target.value)}>
              <option value="">— Select tenant —</option>
              {tenants.map(t => <option key={t.id} value={t.id}>{`${t.first_name || ''} ${t.last_name || ''}`.trim()}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label style={lbl}>Start date *</label><input style={inp} type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} /></div>
            <div><label style={lbl}>End date</label><input style={inp} type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} placeholder="auto +1 yr" /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label style={lbl}>Monthly rent ($) *</label><input style={inp} type="number" min={0} value={form.monthly_rent} onChange={e => set('monthly_rent', e.target.value)} /></div>
            <div><label style={lbl}>Security deposit ($)</label><input style={inp} type="number" min={0} value={form.security_deposit} onChange={e => set('security_deposit', e.target.value)} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={lbl}>Opening balance ($)</label>
              <input style={inp} type="number" value={form.opening_balance} onChange={e => set('opening_balance', e.target.value)} placeholder="carried-over amount owed" />
            </div>
            <div>
              <label style={lbl}>As of</label>
              <input style={inp} type="date" value={form.opening_balance_date} onChange={e => set('opening_balance_date', e.target.value)} />
            </div>
          </div>
          <div>
            <label style={lbl}>Notes</label>
            <textarea style={{ ...inp, resize: 'vertical', minHeight: 56 }} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Late fee, pets, escalation…" />
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '10px', background: VT.tint, border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, color: VT.text2, cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ flex: 2, padding: '10px', background: VT.brand, border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : 'Create lease'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
