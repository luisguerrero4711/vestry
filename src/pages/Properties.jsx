import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import Layout from '../components/Layout'
import { isDemoUser, demoProperties } from '../lib/demoData'
import { usePlan } from '../hooks/usePlan'

const TYPES = ['single_family','multi_family','condo','townhouse','commercial']

function PropertyModal({ property, onClose, onSave }) {
  const { user } = useAuth()
  const isEdit = !!property?.id
  const [form, setForm] = useState({
    name: '', address: '', city: '', state: '', zip: '',
    type: 'single_family', units_count: 1, notes: '',
    ...property,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async (e) => {
    e.preventDefault()
    if (isDemoUser(user)) { onSave(); return }
    setLoading(true); setError('')
    const payload = { ...form, user_id: user.id, updated_at: new Date().toISOString() }
    const { error } = isEdit
      ? await supabase.from('properties').update(payload).eq('id', property.id)
      : await supabase.from('properties').insert(payload)
    if (error) { setError(error.message); setLoading(false); return }
    onSave()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{isEdit ? 'Edit Property' : 'Add Property'}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSave}>
          <div className="modal-body">
            {error && <div className="alert alert-error">{error}</div>}

            <div className="form-group">
              <label className="form-label">Property Name *</label>
              <input className="form-input" placeholder="e.g. 53 Java St, Unit 2"
                value={form.name} onChange={e => set('name', e.target.value)} required />
            </div>

            <div className="form-group">
              <label className="form-label">Street Address *</label>
              <input className="form-input" placeholder="123 Main St"
                value={form.address} onChange={e => set('address', e.target.value)} required />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">City</label>
                <input className="form-input" placeholder="Brooklyn"
                  value={form.city} onChange={e => set('city', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">State</label>
                <input className="form-input" placeholder="NY" maxLength={2}
                  value={form.state} onChange={e => set('state', e.target.value.toUpperCase())} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">ZIP Code</label>
                <input className="form-input" placeholder="11222"
                  value={form.zip} onChange={e => set('zip', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Number of Units</label>
                <input type="number" className="form-input" min={1} max={50}
                  value={form.units_count} onChange={e => set('units_count', Number(e.target.value))} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Property Type</label>
              <select className="form-select"
                value={form.type} onChange={e => set('type', e.target.value)}>
                {TYPES.map(t => <option key={t} value={t}>{t.replace('_',' ')}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" placeholder="Any notes about this property…"
                value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving…' : isEdit ? 'Save changes' : 'Add property'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Properties() {
  const { user } = useAuth()
  const { canAddProperty, limits } = usePlan()
  const [props, setProps]     = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null) // null | 'new' | property object
  const [deleting, setDel]    = useState(null)

  const fetchProps = async () => {
    setLoading(true)
    if (isDemoUser(user)) { setProps(demoProperties); setLoading(false); return }
    const { data } = await supabase.from('properties')
      .select('*').eq('user_id', user.id).order('created_at')
    setProps(data ?? [])
    setLoading(false)
  }

  useEffect(() => { if (user) fetchProps() }, [user])

  const handleDelete = async (id) => {
    if (isDemoUser(user)) { alert('Demo mode — changes are not saved.'); return }
    if (!window.confirm('Delete this property? This cannot be undone.')) return
    await supabase.from('properties').delete().eq('id', id)
    fetchProps()
  }

  return (
    <Layout>
      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Properties</h1>
            <p className="page-subtitle">Manage your rental portfolio</p>
          </div>
          {canAddProperty(props.length) ? (
            <button className="btn btn-accent" onClick={() => setModal('new')}>
              + Add Property
            </button>
          ) : (
            <a href="/pricing" className="btn btn-outline" title={`Upgrade to add more than ${limits.maxProperties} propert${limits.maxProperties === 1 ? 'y' : 'ies'}`}>
              ✦ Upgrade to add more
            </a>
          )}
        </div>

        {loading ? (
          <div className="spinner" />
        ) : props.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-icon">🏠</div>
              <div className="empty-title">No properties yet</div>
              <div className="empty-sub">Add your first property to start tracking rent and tenants.</div>
              <button className="btn btn-primary" onClick={() => setModal('new')}>
                Add first property
              </button>
            </div>
          </div>
        ) : (
          <div style={styles.grid}>
            {props.map(prop => (
              <div key={prop.id} className="card" style={styles.propCard}>
                <div style={styles.propTop}>
                  <div style={styles.propEmoji}>🏠</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={styles.propName}>{prop.name}</div>
                    <div style={styles.propAddress}>{prop.address}</div>
                    <div style={styles.propCity}>
                      {[prop.city, prop.state, prop.zip].filter(Boolean).join(', ')}
                    </div>
                  </div>
                </div>

                <div style={styles.propMeta}>
                  <span className="pill pill-accent" style={{ fontSize: 10.5 }}>
                    {prop.type?.replace('_', ' ')}
                  </span>
                  <span style={styles.metaItem}>
                    {prop.units_count} {prop.units_count === 1 ? 'unit' : 'units'}
                  </span>
                </div>

                {prop.notes && (
                  <div style={styles.propNotes}>{prop.notes}</div>
                )}

                <div style={styles.propActions}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setModal(prop)}>
                    ✏️ Edit
                  </button>
                  <button className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--late)' }}
                    onClick={() => handleDelete(prop.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <PropertyModal
          property={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); fetchProps() }}
        />
      )}
    </Layout>
  )
}

const styles = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: 18,
  },
  propCard: {
    padding: 22,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  propTop: {
    display: 'flex',
    gap: 14,
    alignItems: 'flex-start',
  },
  propEmoji: {
    width: 44,
    height: 44,
    borderRadius: 10,
    background: 'var(--light-fill)',
    border: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
    flexShrink: 0,
  },
  propName: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 17,
    fontWeight: 600,
    color: 'var(--head)',
    lineHeight: 1.2,
    marginBottom: 3,
  },
  propAddress: {
    fontSize: 12.5,
    color: 'var(--text)',
    marginBottom: 2,
  },
  propCity: {
    fontSize: 11.5,
    color: 'var(--muted)',
  },
  propMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  metaItem: {
    fontSize: 12,
    color: 'var(--muted)',
    fontWeight: 500,
  },
  propNotes: {
    fontSize: 12.5,
    color: 'var(--muted)',
    lineHeight: 1.5,
    padding: '10px 12px',
    background: 'var(--cream)',
    borderRadius: 8,
    border: '1px solid var(--border)',
  },
  propActions: {
    display: 'flex',
    gap: 8,
    paddingTop: 4,
    borderTop: '1px solid var(--border)',
    marginTop: 4,
  },
}
