import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import Layout from '../components/Layout'
import StatusPill from '../components/StatusPill'
import { isDemoUser, demoTenants, demoProperties } from '../lib/demoData'

function TenantModal({ tenant, properties, onClose, onSave }) {
  const { user } = useAuth()
  const isEdit   = !!tenant?.id
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    property_id: '', unit_id: '',
    move_in_date: '', move_out_date: '',
    emergency_contact_name: '', emergency_contact_phone: '',
    status: 'active', notes: '',
    ...tenant,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async (e) => {
    e.preventDefault()
    if (isDemoUser(user)) { onSave(); return }
    setLoading(true); setError('')
    const payload = { ...form, user_id: user.id, updated_at: new Date().toISOString() }
    // coerce empty strings to null for FK fields
    if (!payload.property_id) payload.property_id = null
    if (!payload.unit_id)     payload.unit_id     = null

    const { error } = isEdit
      ? await supabase.from('tenants').update(payload).eq('id', tenant.id)
      : await supabase.from('tenants').insert(payload)
    if (error) { setError(error.message); setLoading(false); return }
    onSave()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{isEdit ? 'Edit Tenant' : 'Add Tenant'}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSave}>
          <div className="modal-body">
            {error && <div className="alert alert-error">{error}</div>}

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">First Name *</label>
                <input className="form-input" placeholder="Maria"
                  value={form.first_name} onChange={e => set('first_name', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name *</label>
                <input className="form-input" placeholder="Rivera"
                  value={form.last_name} onChange={e => set('last_name', e.target.value)} required />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" className="form-input" placeholder="tenant@example.com"
                  value={form.email} onChange={e => set('email', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" placeholder="(555) 123-4567"
                  value={form.phone} onChange={e => set('phone', e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Property</label>
              <select className="form-select"
                value={form.property_id} onChange={e => set('property_id', e.target.value)}>
                <option value="">— Select property —</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Move-in Date</label>
                <input type="date" className="form-input"
                  value={form.move_in_date} onChange={e => set('move_in_date', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Move-out Date</label>
                <input type="date" className="form-input"
                  value={form.move_out_date} onChange={e => set('move_out_date', e.target.value)} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Emergency Contact</label>
                <input className="form-input" placeholder="Name"
                  value={form.emergency_contact_name}
                  onChange={e => set('emergency_contact_name', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Emergency Phone</label>
                <input className="form-input" placeholder="(555) 000-0000"
                  value={form.emergency_contact_phone}
                  onChange={e => set('emergency_contact_phone', e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select"
                value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="active">Active</option>
                <option value="past">Past</option>
                <option value="prospect">Prospect</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" placeholder="Any notes about this tenant…"
                value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving…' : isEdit ? 'Save changes' : 'Add tenant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Tenants() {
  const { user } = useAuth()
  const [tenants, setTenants]     = useState([])
  const [properties, setProps]    = useState([])
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(null)
  const [filter, setFilter]       = useState('active')

  const fetchData = async () => {
    setLoading(true)
    if (isDemoUser(user)) {
      setTenants(demoTenants)
      setProps(demoProperties.map(p => ({ id: p.id, name: p.name })))
      setLoading(false)
      return
    }
    const [{ data: t }, { data: p }] = await Promise.all([
      supabase.from('tenants')
        .select('*, properties(name,city,state)')
        .eq('user_id', user.id)
        .order('last_name'),
      supabase.from('properties').select('id,name').eq('user_id', user.id),
    ])
    setTenants(t ?? [])
    setProps(p ?? [])
    setLoading(false)
  }

  useEffect(() => { if (user) fetchData() }, [user])

  const handleDelete = async (id) => {
    if (isDemoUser(user)) { alert('Demo mode — changes are not saved.'); return }
    if (!window.confirm('Delete this tenant? This cannot be undone.')) return
    await supabase.from('tenants').delete().eq('id', id)
    fetchData()
  }

  const filtered = tenants.filter(t => filter === 'all' || t.status === filter)

  return (
    <Layout>
      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Tenants</h1>
            <p className="page-subtitle">{tenants.filter(t => t.status === 'active').length} active tenants</p>
          </div>
          <button className="btn btn-accent" onClick={() => setModal('new')}>
            + Add Tenant
          </button>
        </div>

        {/* Filter tabs */}
        <div style={styles.filterRow}>
          {['active','past','all'].map(f => (
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
              <div className="empty-icon">👤</div>
              <div className="empty-title">No tenants here</div>
              <div className="empty-sub">
                {filter === 'active' ? 'Add active tenants to track rent and leases.' : 'No tenants in this filter.'}
              </div>
              {filter === 'active' && (
                <button className="btn btn-primary" onClick={() => setModal('new')}>
                  Add first tenant
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Property</th>
                  <th>Move-in</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id}>
                    <td>
                      <div style={styles.tenantName}>
                        <div style={styles.avatar}>
                          {t.first_name[0]}{t.last_name[0]}
                        </div>
                        <div>
                          <div className="td-primary">{t.first_name} {t.last_name}</div>
                          {t.email && <div className="td-secondary">{t.email}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ color: 'var(--muted)', fontSize: 12.5 }}>
                      {t.properties?.name ?? '—'}
                    </td>
                    <td style={{ color: 'var(--muted)', fontSize: 12.5 }}>
                      {t.move_in_date
                        ? new Date(t.move_in_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : '—'}
                    </td>
                    <td style={{ fontSize: 12.5 }}>{t.phone || '—'}</td>
                    <td><StatusPill status={t.status} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setModal(t)}>Edit</button>
                        <button className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--late)' }}
                          onClick={() => handleDelete(t.id)}>Del</button>
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
        <TenantModal
          tenant={modal === 'new' ? null : modal}
          properties={properties}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); fetchData() }}
        />
      )}
    </Layout>
  )
}

const styles = {
  filterRow: {
    display: 'flex',
    gap: 6,
    marginBottom: 20,
    background: 'var(--warm-white)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: 4,
    width: 'fit-content',
  },
  filterBtn: {
    padding: '7px 16px',
    border: 'none',
    borderRadius: 7,
    background: 'transparent',
    color: 'var(--muted)',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
    transition: 'background 0.15s, color 0.15s',
  },
  filterActive: {
    background: 'var(--active-bg)',
    color: 'var(--active-fg)',
    fontWeight: 600,
  },
  tenantName: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: 'var(--light-fill)',
    border: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--muted)',
    flexShrink: 0,
  },
}
