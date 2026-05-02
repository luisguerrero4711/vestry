import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import Layout from '../components/Layout'
import StatusPill from '../components/StatusPill'
import { isDemoUser, demoPayments, demoProperties, demoTenants } from '../lib/demoData'
import { usePlan } from '../hooks/usePlan'

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n ?? 0)

const METHODS = ['cash','check','venmo','zelle','bank_transfer','other']

// ── Payment Modal ─────────────────────────────────────────────────────────────
function PaymentModal({ payment, properties, tenants, onClose, onSave }) {
  const { user } = useAuth()
  const isEdit   = !!payment?.id
  const [form, setForm] = useState({
    property_id: '', tenant_id: '', amount: '', due_date: '',
    paid_date: '', payment_method: 'cash', status: 'due', notes: '',
    ...payment,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async (e) => {
    e.preventDefault()
    if (isDemoUser(user)) { onSave(); return }
    setLoading(true); setError('')
    const payload = {
      ...form,
      user_id: user.id,
      amount: Number(form.amount),
      tenant_id: form.tenant_id || null,
      unit_id: null,
    }
    const { error } = isEdit
      ? await supabase.from('rent_payments').update(payload).eq('id', payment.id)
      : await supabase.from('rent_payments').insert(payload)
    if (error) { setError(error.message); setLoading(false); return }
    onSave()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{isEdit ? 'Edit Payment' : 'Log Payment'}</div>
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

            <div className="form-group">
              <label className="form-label">Tenant</label>
              <select className="form-select"
                value={form.tenant_id} onChange={e => set('tenant_id', e.target.value)}>
                <option value="">— Select tenant —</option>
                {tenants
                  .filter(t => !form.property_id || t.property_id === form.property_id)
                  .map(t => (
                    <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                  ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Amount *</label>
                <input type="number" className="form-input" placeholder="1500" min={0} step="0.01"
                  value={form.amount} onChange={e => set('amount', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Due Date *</label>
                <input type="date" className="form-input" required
                  value={form.due_date} onChange={e => set('due_date', e.target.value)} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select"
                  value={form.status} onChange={e => set('status', e.target.value)}>
                  <option value="due">Due</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="partial">Partial</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Paid Date</label>
                <input type="date" className="form-input"
                  value={form.paid_date} onChange={e => set('paid_date', e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Payment Method</label>
              <select className="form-select"
                value={form.payment_method} onChange={e => set('payment_method', e.target.value)}>
                {METHODS.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" placeholder="Any notes…"
                value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving…' : isEdit ? 'Save changes' : 'Log payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Stripe action helpers ─────────────────────────────────────────────────────
function useStripeActions(fetchData) {
  const [loadingId, setLoadingId] = useState(null)
  const [toast, setToast]         = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const requestPayment = async (payment, property) => {
    if (!payment.tenant_id) { showToast('Assign a tenant to this payment first.', 'error'); return }
    setLoadingId(payment.id + '_request')
    try {
      const res = await fetch('/.netlify/functions/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_id:    payment.id,
          tenant_id:     payment.tenant_id,
          amount:        Number(payment.amount),
          description:   `Due ${payment.due_date}`,
          property_name: property?.name || 'Property',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error creating checkout')
      navigator.clipboard?.writeText(data.url).catch(() => {})
      showToast('Payment link created and copied to clipboard!')
      fetchData()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoadingId(null)
    }
  }

  const openBillingPortal = async (tenantId) => {
    setLoadingId(tenantId + '_portal')
    try {
      const res = await fetch('/.netlify/functions/billing-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: tenantId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error opening portal')
      window.open(data.url, '_blank')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoadingId(null)
    }
  }

  return { loadingId, toast, requestPayment, openBillingPortal }
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Payments() {
  const { user } = useAuth()
  const { can }  = usePlan()
  const [payments, setPays]    = useState([])
  const [properties, setProps] = useState([])
  const [tenants, setTens]     = useState([])
  const [loading, setLoading]  = useState(true)
  const [modal, setModal]      = useState(null)
  const [filter, setFilter]    = useState('all')

  const fetchData = async () => {
    setLoading(true)
    if (isDemoUser(user)) {
      setPays([...demoPayments].reverse())
      setProps(demoProperties.map(p => ({ id: p.id, name: p.name })))
      setTens(demoTenants.filter(t => t.status === 'active'))
      setLoading(false)
      return
    }
    const [{ data: pays }, { data: props }, { data: tens }] = await Promise.all([
      supabase.from('rent_payments')
        .select('*, properties(name,city,state), tenants(first_name,last_name)')
        .eq('user_id', user.id)
        .order('due_date', { ascending: false }),
      supabase.from('properties').select('id,name').eq('user_id', user.id),
      supabase.from('tenants').select('id,first_name,last_name,property_id').eq('user_id', user.id).eq('status', 'active'),
    ])
    setPays(pays ?? [])
    setProps(props ?? [])
    setTens(tens ?? [])
    setLoading(false)
  }

  useEffect(() => { if (user) fetchData() }, [user])

  const { loadingId, toast, requestPayment, openBillingPortal } = useStripeActions(fetchData)

  const handleDelete = async (id) => {
    if (isDemoUser(user)) { alert('Demo mode — changes are not saved.'); return }
    if (!window.confirm('Delete this payment record?')) return
    await supabase.from('rent_payments').delete().eq('id', id)
    fetchData()
  }

  const filtered       = filter === 'all' ? payments : payments.filter(p => p.status === filter)
  const totalCollected = payments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0)
  const totalDue       = payments.filter(p => ['due','overdue'].includes(p.status)).reduce((s, p) => s + Number(p.amount), 0)
  const propMap        = Object.fromEntries(properties.map(p => [p.id, p]))

  return (
    <Layout>
      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Payments</h1>
            <p className="page-subtitle">Manual tracking + Stripe online payments</p>
          </div>
          <button className="btn btn-accent" onClick={() => setModal('new')}>+ Log Payment</button>
        </div>

        {/* Toast notification */}
        {toast && (
          <div style={{
            position: 'fixed', top: 20, right: 20, zIndex: 9999,
            background: toast.type === 'error' ? 'var(--late)' : '#059669',
            color: '#fff', padding: '12px 20px', borderRadius: 10,
            fontSize: 13.5, fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            transition: 'opacity 0.2s',
          }}>
            {toast.msg}
          </div>
        )}

        {/* Summary pills */}
        <div style={styles.summaryRow}>
          <div style={styles.summaryCard}>
            <div style={styles.summaryVal}>{fmt(totalCollected)}</div>
            <div style={styles.summaryLabel}>Total Collected</div>
          </div>
          <div style={styles.summaryCard}>
            <div style={{ ...styles.summaryVal, color: 'var(--due)' }}>{fmt(totalDue)}</div>
            <div style={styles.summaryLabel}>Outstanding</div>
          </div>
        </div>

        {/* Filter */}
        <div style={styles.filterRow}>
          {['all','paid','due','overdue','partial'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ ...styles.filterBtn, ...(filter === f ? styles.filterActive : {}) }}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="spinner" />
        ) : filtered.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-icon">💳</div>
              <div className="empty-title">No payments logged</div>
              <div className="empty-sub">Log manual payments or use Stripe to request payment online.</div>
              <button className="btn btn-primary" onClick={() => setModal('new')}>Log a payment</button>
            </div>
          </div>
        ) : (
          <div className="card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Tenant</th>
                  <th>Due Date</th>
                  <th>Paid Date</th>
                  <th>Method</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div className="td-primary">{p.properties?.name ?? '—'}</div>
                      <div className="td-secondary">{p.properties?.city}</div>
                    </td>
                    <td style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                      {p.tenants ? `${p.tenants.first_name} ${p.tenants.last_name}` : '—'}
                    </td>
                    <td style={{ fontSize: 12.5 }}>
                      {p.due_date ? new Date(p.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '—'}
                    </td>
                    <td style={{ fontSize: 12.5 }}>
                      {p.paid_date ? new Date(p.paid_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '—'}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'capitalize' }}>
                      {p.payment_method ?? '—'}
                    </td>
                    <td className="td-mono">{fmt(p.amount)}</td>
                    <td><StatusPill status={p.status} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setModal(p)}>Edit</button>
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--late)' }}
                          onClick={() => handleDelete(p.id)}>Del</button>

                        {/* Stripe: request payment or copy existing link */}
                        {p.status !== 'paid' && !isDemoUser(user) && (
                          can('stripePayments') ? (
                            p.payment_link ? (
                              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--accent)' }}
                                title="Copy payment link to clipboard"
                                onClick={() => navigator.clipboard?.writeText(p.payment_link)}>
                                📋 Copy Link
                              </button>
                            ) : (
                              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--accent)' }}
                                disabled={loadingId === p.id + '_request'}
                                title="Create Stripe payment link and copy to clipboard"
                                onClick={() => requestPayment(p, propMap[p.property_id])}>
                                {loadingId === p.id + '_request' ? '…' : '💳 Request'}
                              </button>
                            )
                          ) : (
                            <a href="/pricing" style={{ fontSize: 11.5, color: 'var(--accent)', fontWeight: 600, whiteSpace: 'nowrap' }}
                              title="Upgrade to Pro to use Stripe payments">
                              ✦ Pro feature
                            </a>
                          )
                        )}

                        {/* Stripe: autopay / billing portal */}
                        {p.tenant_id && !isDemoUser(user) && can('stripePayments') && (
                          <button className="btn btn-ghost btn-sm" style={{ color: '#6366f1' }}
                            disabled={loadingId === p.tenant_id + '_portal'}
                            title="Open Stripe portal — tenant can save card and set up autopay"
                            onClick={() => openBillingPortal(p.tenant_id)}>
                            {loadingId === p.tenant_id + '_portal' ? '…' : '↻ Autopay'}
                          </button>
                        )}
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
        <PaymentModal
          payment={modal === 'new' ? null : modal}
          properties={properties}
          tenants={tenants}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); fetchData() }}
        />
      )}
    </Layout>
  )
}

const styles = {
  summaryRow: { display: 'flex', gap: 14, marginBottom: 20 },
  summaryCard: {
    background: 'var(--warm-white)', border: '1px solid var(--border)',
    borderRadius: 12, padding: '14px 20px',
  },
  summaryVal: {
    fontFamily: "'Cormorant Garamond', serif", fontSize: 26,
    fontWeight: 600, color: 'var(--text)', lineHeight: 1,
  },
  summaryLabel: {
    fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.07em', color: 'var(--muted)', marginTop: 4,
  },
  filterRow: {
    display: 'flex', gap: 4, marginBottom: 18, background: 'var(--warm-white)',
    border: '1px solid var(--border)', borderRadius: 10, padding: 3, width: 'fit-content',
  },
  filterBtn: {
    padding: '7px 14px', border: 'none', borderRadius: 7,
    background: 'transparent', color: 'var(--muted)', fontSize: 12.5,
    fontWeight: 500, cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
    transition: 'background 0.15s, color 0.15s',
  },
  filterActive: { background: 'var(--active-bg)', color: 'var(--active-fg)', fontWeight: 600 },
}
