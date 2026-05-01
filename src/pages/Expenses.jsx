import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import Layout from '../components/Layout'

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n ?? 0)

const CATEGORIES = ['maintenance','insurance','taxes','utilities','management','mortgage','other']

function ExpenseModal({ expense, properties, onClose, onSave }) {
  const { user } = useAuth()
  const isEdit   = !!expense?.id
  const [form, setForm] = useState({
    property_id: '', category: 'maintenance', description: '',
    amount: '', date: new Date().toISOString().split('T')[0],
    vendor: '', notes: '',
    ...expense,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    const payload = { ...form, user_id: user.id, amount: Number(form.amount), unit_id: null }
    const { error } = isEdit
      ? await supabase.from('expenses').update(payload).eq('id', expense.id)
      : await supabase.from('expenses').insert(payload)
    if (error) { setError(error.message); setLoading(false); return }
    onSave()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{isEdit ? 'Edit Expense' : 'Log Expense'}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSave}>
          <div className="modal-body">
            {error && <div className="alert alert-error">{error}</div>}

            <div className="form-group">
              <label className="form-label">Property *</label>
              <select className="form-select" required
                value={form.property_id} onChange={e => set('property_id', e.target.value)}>
                <option value="">— Select property —</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-select"
                  value={form.category} onChange={e => set('category', e.target.value)}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Amount *</label>
                <input type="number" className="form-input" placeholder="250" min={0} step="0.01" required
                  value={form.amount} onChange={e => set('amount', e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description *</label>
              <input className="form-input" placeholder="e.g. Plumber repair — bathroom leak" required
                value={form.description} onChange={e => set('description', e.target.value)} />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Date *</label>
                <input type="date" className="form-input" required
                  value={form.date} onChange={e => set('date', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Vendor</label>
                <input className="form-input" placeholder="ABC Plumbing Co."
                  value={form.vendor} onChange={e => set('vendor', e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-textarea"
                value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
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
  const [expenses, setExp]    = useState([])
  const [properties, setProps] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null)
  const [catFilter, setCat]   = useState('all')

  const fetchData = async () => {
    setLoading(true)
    const [{ data: exps }, { data: props }] = await Promise.all([
      supabase.from('expenses')
        .select('*, properties(name)')
        .eq('user_id', user.id)
        .order('date', { ascending: false }),
      supabase.from('properties').select('id,name').eq('user_id', user.id),
    ])
    setExp(exps ?? [])
    setProps(props ?? [])
    setLoading(false)
  }

  useEffect(() => { if (user) fetchData() }, [user])

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense?')) return
    await supabase.from('expenses').delete().eq('id', id)
    fetchData()
  }

  const filtered   = catFilter === 'all' ? expenses : expenses.filter(e => e.category === catFilter)
  const totalShown = filtered.reduce((s, e) => s + Number(e.amount), 0)

  // by-category totals
  const catTotals = CATEGORIES.map(c => ({
    cat: c,
    total: expenses.filter(e => e.category === c).reduce((s, e) => s + Number(e.amount), 0),
  })).filter(x => x.total > 0)

  return (
    <Layout>
      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Expenses</h1>
            <p className="page-subtitle">Track all property-related costs</p>
          </div>
          <button className="btn btn-accent" onClick={() => setModal('new')}>+ Log Expense</button>
        </div>

        {/* Category breakdown */}
        {catTotals.length > 0 && (
          <div style={styles.catRow}>
            {catTotals.map(x => (
              <div key={x.cat} style={styles.catCard}
                onClick={() => setCat(catFilter === x.cat ? 'all' : x.cat)}>
                <div style={styles.catVal}>{fmt(x.total)}</div>
                <div style={styles.catLabel}>{x.cat}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filter bar */}
        <div style={styles.filterRow}>
          {['all', ...CATEGORIES].map(c => (
            <button key={c} onClick={() => setCat(c)}
              style={{ ...styles.filterBtn, ...(catFilter === c ? styles.filterActive : {}) }}>
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </button>
          ))}
        </div>

        {loading ? <div className="spinner" /> : filtered.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-icon">🔧</div>
              <div className="empty-title">No expenses logged</div>
              <div className="empty-sub">Track repairs, insurance, taxes, and more by property.</div>
              <button className="btn btn-primary" onClick={() => setModal('new')}>Log first expense</button>
            </div>
          </div>
        ) : (
          <div className="card">
            <div style={{ padding: '12px 18px 10px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{filtered.length} records</span>
              <span style={{ fontWeight: 600, fontSize: 13.5 }}>Total: {fmt(totalShown)}</span>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Property</th>
                  <th>Category</th>
                  <th>Date</th>
                  <th>Vendor</th>
                  <th>Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(exp => (
                  <tr key={exp.id}>
                    <td className="td-primary">{exp.description}</td>
                    <td style={{ fontSize: 12.5, color: 'var(--muted)' }}>{exp.properties?.name ?? '—'}</td>
                    <td><span className="pill pill-accent" style={{ fontSize: 10.5 }}>{exp.category}</span></td>
                    <td style={{ fontSize: 12 }}>
                      {new Date(exp.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                    </td>
                    <td style={{ fontSize: 12.5, color: 'var(--muted)' }}>{exp.vendor || '—'}</td>
                    <td className="td-mono">{fmt(exp.amount)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setModal(exp)}>Edit</button>
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--late)' }}
                          onClick={() => handleDelete(exp.id)}>Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

const styles = {
  catRow: {
    display: 'flex',
    gap: 10,
    marginBottom: 18,
    flexWrap: 'wrap',
  },
  catCard: {
    background: 'var(--warm-white)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '10px 16px',
    cursor: 'pointer',
    transition: 'border-color 0.15s',
  },
  catVal: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 20,
    fontWeight: 600,
    color: 'var(--text)',
  },
  catLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'var(--muted)',
    fontWeight: 600,
    marginTop: 2,
  },
  filterRow: {
    display: 'flex',
    gap: 4,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  filterBtn: {
    padding: '6px 13px',
    border: '1px solid var(--border)',
    borderRadius: 100,
    background: 'transparent',
    color: 'var(--muted)',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
    transition: 'background 0.15s, color 0.15s',
  },
  filterActive: {
    background: 'var(--active-bg)',
    color: 'var(--active-fg)',
    borderColor: 'var(--pill-bd)',
    fontWeight: 600,
  },
}
