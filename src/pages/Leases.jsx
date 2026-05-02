import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import Layout from '../components/Layout'
import StatusPill from '../components/StatusPill'
import { isDemoUser, demoLeases, demoProperties, demoTenants } from '../lib/demoData'

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n ?? 0)

function LeaseModal({ lease, properties, tenants, onClose, onSave }) {
  const { user } = useAuth()
  const isEdit   = !!lease?.id
  const [form, setForm] = useState({
    property_id: '', tenant_id: '', start_date: '', end_date: '',
    monthly_rent: '', security_deposit: '', status: 'active', notes: '',
    due_day: 1, reminder_days: 3,
    ...lease,
  })
  const [file, setFile]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')

    let pdf_url = form.pdf_url ?? null

    // Upload PDF to Supabase Storage if provided
    if (file) {
      const path = `${user.id}/${Date.now()}-${file.name}`
      const { error: upErr } = await supabase.storage
        .from('vestry-leases')
        .upload(path, file, { upsert: true })
      if (upErr) { setError('PDF upload failed: ' + upErr.message); setLoading(false); return }
      const { data: { publicUrl } } = supabase.storage.from('vestry-leases').getPublicUrl(path)
      pdf_url = publicUrl
    }

    const payload = {
      ...form,
      pdf_url,
      user_id:          user.id,
      monthly_rent:     Number(form.monthly_rent),
      security_deposit: form.security_deposit ? Number(form.security_deposit) : null,
      tenant_id:  form.tenant_id  || null,
      unit_id:    null,
      end_date:   form.end_date   || null,
    }

    const { error } = isEdit
      ? await supabase.from('leases').update(payload).eq('id', lease.id)
      : await supabase.from('leases').insert(payload)
    if (error) { setError(error.message); setLoading(false); return }
    onSave()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{isEdit ? 'Edit Lease' : 'Add Lease'}</div>
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
                {tenants.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Start Date *</label>
                <input type="date" className="form-input" required
                  value={form.start_date} onChange={e => set('start_date', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">End Date</label>
                <input type="date" className="form-input"
                  value={form.end_date} onChange={e => set('end_date', e.target.value)} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Monthly Rent *</label>
                <input type="number" className="form-input" placeholder="1500" min={0} required
                  value={form.monthly_rent} onChange={e => set('monthly_rent', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Security Deposit</label>
                <input type="number" className="form-input" placeholder="1500" min={0}
                  value={form.security_deposit} onChange={e => set('security_deposit', e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select"
                value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Lease PDF</label>
              <input type="file" accept="application/pdf"
                style={{ fontSize: 13, color: 'var(--muted)' }}
                onChange={e => setFile(e.target.files[0])} />
              {form.pdf_url && !file && (
                <a href={form.pdf_url} target="_blank" rel="noreferrer"
                  style={{ fontSize: 12, color: 'var(--accent)', marginTop: 4, display: 'block' }}>
                  📄 View current lease PDF
                </a>
              )}
            </div>

            {/* Stripe / reminder settings */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Rent Due Day</label>
                <select className="form-select"
                  value={form.due_day} onChange={e => set('due_day', Number(e.target.value))}>
                  <option value={1}>1st of month</option>
                  <option value={15}>15th of month</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Reminder (days before)</label>
                <select className="form-select"
                  value={form.reminder_days} onChange={e => set('reminder_days', Number(e.target.value))}>
                  <option value={1}>1 day before</option>
                  <option value={2}>2 days before</option>
                  <option value={3}>3 days before</option>
                  <option value={5}>5 days before</option>
                  <option value={7}>7 days before</option>
                </select>
              </div>
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
              {loading ? 'Saving…' : isEdit ? 'Save changes' : 'Add lease'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Leases() {
  const { user } = useAuth()
  const [leases, setLeases]   = useState([])
  const [properties, setProps] = useState([])
  const [tenants, setTens]    = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null)

  const fetchData = async () => {
    setLoading(true)
    if (isDemoUser(user)) {
      setLeases(demoLeases)
      setProps(demoProperties.map(p => ({ id: p.id, name: p.name })))
      setTens(demoTenants.map(t => ({ id: t.id, first_name: t.first_name, last_name: t.last_name })))
      setLoading(false)
      return
    }
    const [{ data: ls }, { data: ps }, { data: ts }] = await Promise.all([
      supabase.from('leases')
        .select('*, properties(name), tenants(first_name,last_name)')
        .eq('user_id', user.id)
        .order('start_date', { ascending: false }),
      supabase.from('properties').select('id,name').eq('user_id', user.id),
      supabase.from('tenants').select('id,first_name,last_name').eq('user_id', user.id),
    ])
    setLeases(ls ?? [])
    setProps(ps ?? [])
    setTens(ts ?? [])
    setLoading(false)
  }

  useEffect(() => { if (user) fetchData() }, [user])

  const handleDelete = async (id) => {
    if (isDemoUser(user)) { alert('Demo mode — changes are not saved.'); return }
    if (!window.confirm('Delete this lease?')) return
    await supabase.from('leases').delete().eq('id', id)
    fetchData()
  }

  return (
    <Layout>
      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Leases</h1>
            <p className="page-subtitle">Store and manage signed lease agreements</p>
          </div>
          <button className="btn btn-accent" onClick={() => setModal('new')}>+ Add Lease</button>
        </div>

        {loading ? <div className="spinner" /> : leases.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-icon">📄</div>
              <div className="empty-title">No leases yet</div>
              <div className="empty-sub">Upload signed lease PDFs for your tenants.</div>
              <button className="btn btn-primary" onClick={() => setModal('new')}>Add first lease</button>
            </div>
          </div>
        ) : (
          <div className="card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Tenant</th>
                  <th>Term</th>
                  <th>Monthly Rent</th>
                  <th>Deposit</th>
                  <th>Status</th>
                  <th>PDF</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {leases.map(l => (
                  <tr key={l.id}>
                    <td className="td-primary">{l.properties?.name ?? '—'}</td>
                    <td style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                      {l.tenants ? `${l.tenants.first_name} ${l.tenants.last_name}` : '—'}
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {new Date(l.start_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      {l.end_date ? ` → ${new Date(l.end_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}` : ' → Month-to-month'}
                    </td>
                    <td className="td-mono">{fmt(l.monthly_rent)}</td>
                    <td style={{ fontSize: 12.5 }}>{l.security_deposit ? fmt(l.security_deposit) : '—'}</td>
                    <td><StatusPill status={l.status} /></td>
                    <td>
                      {l.pdf_url
                        ? <a href={l.pdf_url} target="_blank" rel="noreferrer"
                            style={{ color: 'var(--accent)', fontSize: 12.5, textDecoration: 'none' }}>📄 View</a>
                        : <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setModal(l)}>Edit</button>
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--late)' }}
                          onClick={() => handleDelete(l.id)}>Del</button>
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
        <LeaseModal
          lease={modal === 'new' ? null : modal}
          properties={properties}
          tenants={tenants}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); fetchData() }}
        />
      )}
    </Layout>
  )
}
