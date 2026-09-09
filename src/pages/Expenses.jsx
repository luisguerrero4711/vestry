import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import Layout from '../components/Layout'
import { isDemoUser, demoExpenses, demoProperties } from '../lib/demoData'
import { VT, VIcon, VPill, VSection } from '../lib/vestry-shared'

const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n ?? 0)
const CATEGORIES = ['maintenance', 'insurance', 'taxes', 'utilities', 'management', 'mortgage', 'other']
const cap = (s = '') => s.charAt(0).toUpperCase() + s.slice(1)

const inp = {
  width: '100%', padding: '9px 12px', border: `1.5px solid ${VT.line}`, borderRadius: 10,
  background: VT.card, color: VT.text1, fontFamily: VT.fontText, fontSize: 13, fontWeight: 500, outline: 'none',
}
const lbl = { fontSize: 11, fontWeight: 600, color: VT.text3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, display: 'block' }

function ExpenseModal({ expense, properties, onClose, onSave }) {
  const { user } = useAuth()
  const isEdit = !!expense?.id
  const [form, setForm] = useState({
    property_id: expense?.property_id || '',
    category: expense?.category || 'maintenance',
    description: expense?.description || '',
    amount: expense?.amount ?? '',
    date: expense?.date || new Date().toISOString().split('T')[0],
    vendor: expense?.vendor || '',
    notes: expense?.notes || '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async (e) => {
    e.preventDefault()
    if (isDemoUser(user)) { onSave(); return }
    setLoading(true); setError('')
    const payload = {
      user_id: user.id,
      property_id: form.property_id,
      category: form.category,
      description: form.description.trim(),
      amount: Number(form.amount),
      date: form.date,
      vendor: form.vendor.trim() || null,
      notes: form.notes.trim() || null,
    }
    const { error: err } = isEdit
      ? await supabase.from('expenses').update(payload).eq('id', expense.id)
      : await supabase.from('expenses').insert(payload)
    if (err) { setError(err.message); setLoading(false); return }
    onSave()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: VT.card, borderRadius: 18, width: '100%', maxWidth: 460, boxShadow: VT.shadowLg, maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${VT.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: VT.fontDisplay, fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em' }}>{isEdit ? 'Edit expense' : 'Log expense'}</div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, background: VT.tint, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <VIcon.X s={14} c={VT.text2} />
          </button>
        </div>
        <form onSubmit={handleSave} style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 13 }}>
          {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#b91c1c', fontWeight: 500 }}>{error}</div>}
          {isDemoUser(user) && <div style={{ background: VT.brandTint, borderRadius: 8, padding: '8px 12px', fontSize: 12, color: VT.brand, fontWeight: 500 }}>Demo mode — saved for this session only.</div>}
          <div>
            <label style={lbl}>Property *</label>
            <select style={{ ...inp, cursor: 'pointer' }} required value={form.property_id} onChange={e => set('property_id', e.target.value)}>
              <option value="">— Select property —</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={lbl}>Category</label>
              <select style={{ ...inp, cursor: 'pointer' }} value={form.category} onChange={e => set('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{cap(c)}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Amount *</label><input style={inp} type="number" min={0} step="0.01" required value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="250" /></div>
          </div>
          <div><label style={lbl}>Description *</label><input style={inp} required value={form.description} onChange={e => set('description', e.target.value)} placeholder="e.g. Plumber repair — bathroom leak" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label style={lbl}>Date *</label><input style={inp} type="date" required value={form.date} onChange={e => set('date', e.target.value)} /></div>
            <div><label style={lbl}>Vendor</label><input style={inp} value={form.vendor} onChange={e => set('vendor', e.target.value)} placeholder="ABC Plumbing Co." /></div>
          </div>
          <div><label style={lbl}>Notes</label><textarea style={{ ...inp, resize: 'vertical', minHeight: 56 }} value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '10px', background: VT.tint, border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, color: VT.text2, cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={loading} style={{ flex: 2, padding: '10px', background: VT.brand, border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Saving…' : isEdit ? 'Save changes' : 'Log expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Expenses() {
  const { user } = useAuth()
  const [expenses, setExp] = useState([])
  const [properties, setProps] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [catFilter, setCat] = useState('all')

  const fetchData = async () => {
    setLoading(true)
    if (isDemoUser(user)) {
      setExp([...demoExpenses].sort((a, b) => b.date.localeCompare(a.date)))
      setProps(demoProperties.map(p => ({ id: p.id, name: p.name })))
      setLoading(false)
      return
    }
    const [{ data: exps }, { data: props }] = await Promise.all([
      supabase.from('expenses').select('*, properties(name)').eq('user_id', user.id).order('date', { ascending: false }),
      supabase.from('properties').select('id,name').eq('user_id', user.id),
    ])
    setExp(exps ?? [])
    setProps(props ?? [])
    setLoading(false)
  }

  useEffect(() => { if (user) fetchData() }, [user])

  const handleDelete = async (id) => {
    if (isDemoUser(user)) { alert('Demo mode — changes are not saved.'); return }
    if (!window.confirm('Delete this expense?')) return
    await supabase.from('expenses').delete().eq('id', id)
    fetchData()
  }

  const filtered = catFilter === 'all' ? expenses : expenses.filter(e => e.category === catFilter)
  const totalShown = filtered.reduce((s, e) => s + Number(e.amount), 0)
  const catTotals = CATEGORIES
    .map(c => ({ cat: c, total: expenses.filter(e => e.category === c).reduce((s, e) => s + Number(e.amount), 0) }))
    .filter(x => x.total > 0)

  return (
    <Layout>
      <div className="v-page">
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 13, color: VT.text3, fontWeight: 500, marginBottom: 4 }}>{expenses.length} records · {fmt(expenses.reduce((s, e) => s + Number(e.amount), 0))} total</div>
            <h1 style={{ fontFamily: VT.fontDisplay, fontSize: 30, fontWeight: 600, margin: 0, letterSpacing: '-0.03em', lineHeight: 1.1 }}>Expenses</h1>
          </div>
          <button onClick={() => setModal('new')} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px',
            background: VT.brand, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
            color: '#fff', cursor: 'pointer', boxShadow: '0 1px 2px rgba(37,99,235,0.3)',
          }}><VIcon.Plus s={14} c="#fff" /> Log expense</button>
        </div>

        {catTotals.length > 0 && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            {catTotals.map(x => (
              <div key={x.cat} onClick={() => setCat(catFilter === x.cat ? 'all' : x.cat)} style={{
                background: VT.card, border: `1px solid ${catFilter === x.cat ? 'var(--brand)' : VT.line}`, borderRadius: 10,
                padding: '10px 16px', cursor: 'pointer',
              }}>
                <div style={{ fontFamily: VT.fontDisplay, fontSize: 20, fontWeight: 600 }}>{fmt(x.total)}</div>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: VT.text3, fontWeight: 600, marginTop: 2 }}>{x.cat}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {['all', ...CATEGORIES].map(c => (
            <button key={c} onClick={() => setCat(c)} style={{
              padding: '6px 13px', border: `1px solid ${catFilter === c ? 'transparent' : VT.line}`, borderRadius: 100,
              background: catFilter === c ? VT.brandTint : 'transparent', color: catFilter === c ? VT.brand : VT.text2,
              fontSize: 12, fontWeight: catFilter === c ? 600 : 500, cursor: 'pointer', fontFamily: VT.fontText,
            }}>{cap(c)}</button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: VT.text3, fontWeight: 500 }}>Loading expenses…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: VT.text3, fontWeight: 500 }}>
            No expenses. <button onClick={() => setModal('new')} style={{ background: 'none', border: 'none', color: VT.brand, fontWeight: 600, cursor: 'pointer' }}>Log the first one</button>
          </div>
        ) : (
          <div style={{ background: VT.card, borderRadius: 'var(--r-md)', boxShadow: VT.shadowCard, overflow: 'hidden' }}>
            <div style={{ padding: '12px 20px', borderBottom: `1px solid ${VT.line}`, display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: VT.text3 }}>
              <span>{filtered.length} records</span>
              <span style={{ color: VT.text1 }}>Total: {fmt(totalShown)}</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>
                <thead>
                  <tr style={{ background: VT.tint }}>
                    {['Description', 'Property', 'Category', 'Date', 'Vendor', 'Amount', ''].map((h, i) => (
                      <th key={i} style={{ textAlign: i === 5 ? 'right' : 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: VT.text3, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(exp => (
                    <tr key={exp.id} style={{ borderTop: `1px solid ${VT.line}` }}>
                      <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 600 }}>{exp.description}</td>
                      <td style={{ padding: '14px 16px', fontSize: 12, color: VT.text3, fontWeight: 500 }}>{exp.properties?.name ?? '—'}</td>
                      <td style={{ padding: '14px 16px' }}><VPill tone="neutral">{cap(exp.category)}</VPill></td>
                      <td style={{ padding: '14px 16px', fontSize: 12, color: VT.text2, fontWeight: 500, whiteSpace: 'nowrap' }}>{new Date(exp.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}</td>
                      <td style={{ padding: '14px 16px', fontSize: 12, color: VT.text3, fontWeight: 500 }}>{exp.vendor || '—'}</td>
                      <td style={{ padding: '14px 16px', fontFamily: VT.fontDisplay, fontSize: 14, fontWeight: 600, textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt(exp.amount)}</td>
                      <td style={{ padding: '14px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button onClick={() => setModal(exp)} style={{ background: 'none', border: 'none', color: VT.text2, fontWeight: 600, fontSize: 12, cursor: 'pointer', padding: '4px 6px' }}>Edit</button>
                        <button onClick={() => handleDelete(exp.id)} style={{ background: 'none', border: 'none', color: VT.red, fontWeight: 600, fontSize: 12, cursor: 'pointer', padding: '4px 6px' }}>Del</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {modal && (
        <ExpenseModal
          expense={modal === 'new' ? null : modal}
          properties={properties}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); fetchData() }}
        />
      )}
    </Layout>
  )
}
