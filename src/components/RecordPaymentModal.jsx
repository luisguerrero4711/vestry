import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { isDemoUser, demoProperties, demoTenants, demoLeases } from '../lib/demoData'
import { activeLeaseForTenant } from '../lib/derive'
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

const today = new Date().toISOString().slice(0, 10)

export default function RecordPaymentModal({ onClose, onAdded }) {
  const { user } = useAuth()
  const [properties, setProperties] = useState([])
  const [tenants, setTenants] = useState([])
  const [leases, setLeases] = useState([])
  const [form, setForm] = useState({
    property_id: '', tenant_id: '',
    amount: '', due_date: today, paid_date: today,
    payment_method: 'bank_transfer',
    status: 'paid', notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Load properties + tenants for dropdowns
  useEffect(() => {
    if (isDemoUser(user)) {
      setProperties(demoProperties.map(p => ({ id: p.id, name: p.name })))
      setTenants(demoTenants.map(t => ({
        id: t.id,
        name: `${t.first_name} ${t.last_name}`,
        property_id: t.property_id,
      })))
      setLeases(demoLeases)
      return
    }
    Promise.all([
      supabase.from('properties').select('id, name').eq('user_id', user.id).order('name'),
      supabase.from('tenants').select('id, first_name, last_name, property_id').eq('user_id', user.id).eq('status', 'active').order('first_name'),
      supabase.from('leases').select('id, tenant_id, unit_id, room_id, status').eq('user_id', user.id),
    ]).then(([{ data: props }, { data: tens }, { data: ls }]) => {
      setProperties(props || [])
      setTenants((tens || []).map(t => ({
        id: t.id,
        name: `${t.first_name} ${t.last_name}`.trim(),
        property_id: t.property_id,
      })))
      setLeases(ls || [])
    })
  }, [user])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Filter tenants to selected property
  const filteredTenants = form.property_id
    ? tenants.filter(t => !t.property_id || t.property_id === form.property_id)
    : tenants

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
      setError('Please enter a valid amount greater than 0.'); return
    }
    if (!form.property_id) { setError('Please select a property.'); return }
    setSaving(true); setError('')

    const selectedProp = properties.find(p => p.id === form.property_id)
    const selectedTenant = tenants.find(t => t.id === form.tenant_id)

    const [first_name, ...rest] = (selectedTenant?.name || '').split(' ')

    if (isDemoUser(user)) {
      onAdded?.({
        id: `demo-pay-${Date.now()}`,
        user_id: 'demo-user-id',
        property_id: form.property_id,
        tenant_id: form.tenant_id || null,
        lease_id: null, unit_id: null, room_id: null,
        amount: Number(form.amount),
        due_date: form.due_date,
        paid_date: (form.status === 'paid' || form.status === 'partial') ? form.paid_date : null,
        payment_method: form.payment_method,
        status: form.status,
        notes: form.notes.trim() || null,
        properties: selectedProp ? { name: selectedProp.name } : null,
        tenants: selectedTenant ? { first_name: first_name || '', last_name: rest.join(' ') } : null,
      })
      onClose(); return
    }

    // Link the payment to the tenant's active lease + unit/room when we can,
    // so reminders, autopay and the lease ledger have what they need.
    const lease = activeLeaseForTenant(form.tenant_id, leases)

    const { data, error: err } = await supabase
      .from('rent_payments')
      .insert([{
        user_id: user.id,
        property_id: form.property_id,
        tenant_id: form.tenant_id || null,
        lease_id: lease?.id || null,
        unit_id: lease?.unit_id || null,
        room_id: lease?.room_id || null,
        amount: Number(form.amount),
        due_date: form.due_date,
        paid_date: form.status === 'paid' ? form.paid_date : null,
        payment_method: form.payment_method,
        status: form.status,  // paid | due | overdue | partial
        notes: form.notes.trim() || null,
      }])
      .select('*, properties(name), tenants(first_name, last_name)')
      .single()

    setSaving(false)
    if (err) { setError(err.message); return }

    onAdded?.(data)   // raw rent_payments row (+ properties/tenants joins)
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)',
      backdropFilter: 'blur(6px)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: VT.card, borderRadius: 18, width: '100%', maxWidth: 460,
        boxShadow: VT.shadowLg, maxHeight: '92vh', overflowY: 'auto',
      }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${VT.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: VT.fontDisplay, fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em' }}>Record payment</div>
            <div style={{ fontSize: 12, color: VT.text3, fontWeight: 500, marginTop: 2 }}>Log a rent payment or charge</div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, background: VT.tint, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <VIcon.X s={14} c={VT.text2} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 13 }}>
          {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#b91c1c', fontWeight: 500 }}>{error}</div>}
          {isDemoUser(user) && <div style={{ background: VT.brandTint, borderRadius: 8, padding: '8px 12px', fontSize: 12, color: VT.brand, fontWeight: 500 }}>Demo mode — saved for this session only.</div>}

          <div>
            <label style={lbl}>Property *</label>
            <select style={{ ...inp, cursor: 'pointer' }} value={form.property_id} onChange={e => { set('property_id', e.target.value); set('tenant_id', '') }} required>
              <option value="">— Select property —</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div>
            <label style={lbl}>Tenant</label>
            <select style={{ ...inp, cursor: 'pointer' }} value={form.tenant_id} onChange={e => set('tenant_id', e.target.value)}>
              <option value="">— Select tenant (optional) —</option>
              {filteredTenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={lbl}>Amount *</label>
              <input style={inp} type="number" min={0.01} step={0.01} value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="1500.00" required />
            </div>
            <div>
              <label style={lbl}>Status</label>
              <select style={{ ...inp, cursor: 'pointer' }} value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="paid">Paid</option>
                <option value="due">Due</option>
                <option value="overdue">Overdue</option>
                <option value="partial">Partial</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={lbl}>Due date</label>
              <input style={inp} type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
            </div>
            {form.status === 'paid' || form.status === 'partial' ? (
              <div>
                <label style={lbl}>Paid date</label>
                <input style={inp} type="date" value={form.paid_date} onChange={e => set('paid_date', e.target.value)} />
              </div>
            ) : <div />}
          </div>

          <div>
            <label style={lbl}>Payment method</label>
            <select style={{ ...inp, cursor: 'pointer' }} value={form.payment_method} onChange={e => set('payment_method', e.target.value)}>
              {[
                ['bank_transfer', 'Bank transfer'],
                ['check', 'Check'],
                ['cash', 'Cash'],
                ['venmo', 'Venmo'],
                ['zelle', 'Zelle'],
                ['other', 'Other'],
              ].map(([v, label]) => <option key={v} value={v}>{label}</option>)}
            </select>
          </div>

          <div>
            <label style={lbl}>Notes (optional)</label>
            <input style={inp} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="e.g. Received via check #1042" />
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '10px', background: VT.tint, border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, color: VT.text2, cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ flex: 2, padding: '10px', background: VT.brand, border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : 'Record payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
