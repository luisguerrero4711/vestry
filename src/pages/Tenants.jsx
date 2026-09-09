import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import Layout from '../components/Layout'
import { isDemoUser, demoTenants } from '../lib/demoData'
import { VT, VIcon, VPill, VAvatar } from '../lib/vestry-shared'
import AddTenantModal from '../components/AddTenantModal'
import TenantDetailDrawer from '../components/TenantDetailDrawer'

const AVATAR_COLORS = ['#FF6B6B','#4ECDC4','#FFD93D','#A78BFA','#60A5FA','#34D399','#F472B6','#FB923C']
const avatarColor = (name = '') => AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length]
const initials = (name = '') => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
const fmtMonth = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : ''

export default function Tenants() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    if (!user) { navigate('/auth'); return }
    async function load() {
      if (isDemoUser(user)) {
        setTenants(demoTenants)
      } else {
        const { data } = await supabase
          .from('tenants')
          .select('*, properties(name), units(unit_number), rooms(name)')
          .eq('user_id', user.id)
          .order('first_name')
        setTenants(data || [])
      }
      setLoading(false)
    }
    load()
  }, [user, navigate])

  const filtered = tenants.filter(t => {
    const name = `${t.first_name || ''} ${t.last_name || ''}`.trim()
    const q = search.toLowerCase()
    return name.toLowerCase().includes(q) || (t.email || '').toLowerCase().includes(q)
  })

  const patchTenant = (updated) =>
    setTenants(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t))

  return (
    <Layout>
      {showAddModal && (
        <AddTenantModal
          onClose={() => setShowAddModal(false)}
          onAdded={(t) => setTenants(prev => [...prev, t])}
        />
      )}
      {selected && (
        <TenantDetailDrawer
          tenant={selected}
          onClose={() => setSelected(null)}
          onSaved={patchTenant}
        />
      )}
      <div className="v-page">
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 13, color: VT.text3, fontWeight: 500, marginBottom: 4 }}>
              {tenants.length} tenants · {tenants.filter(t => (t.status || 'active') === 'active').length} active
            </div>
            <h1 style={{ fontFamily: VT.fontDisplay, fontSize: 30, fontWeight: 600, margin: 0, letterSpacing: '-0.03em', lineHeight: 1.1 }}>Tenants</h1>
          </div>
          <div className="v-page-actions" style={{ display: 'flex', gap: 8 }}>
            <div className="v-search-wrap" style={{ position: 'relative', flex: 1, minWidth: 140, maxWidth: 260 }}>
              <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', display: 'flex', pointerEvents: 'none' }}>
                <VIcon.Search s={14} c="var(--text-3)" />
              </div>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search tenants…"
                style={{ padding: '8px 12px 8px 32px', background: VT.card, border: `1px solid ${VT.line}`, borderRadius: 8, fontFamily: VT.fontText, fontSize: 13, color: VT.text1, outline: 'none', fontWeight: 500, width: '100%' }}
              />
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: VT.brand, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer', boxShadow: '0 1px 2px rgba(37,99,235,0.3)', flexShrink: 0 }}
            ><VIcon.Plus s={14} c="#fff" /> Add tenant</button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: VT.text3, fontWeight: 500 }}>Loading tenants…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: VT.text3, fontWeight: 500 }}>No tenants found</div>
        ) : (
          <div style={{ background: VT.card, borderRadius: 'var(--r-md)', boxShadow: VT.shadowCard, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>
                <thead>
                  <tr style={{ background: VT.tint }}>
                    {['Tenant', 'Contact', 'Property', 'Unit / Room', 'Status', ''].map((h, i) => (
                      <th key={i} style={{ textAlign: 'left', padding: '10px 20px', fontSize: 11, fontWeight: 600, color: VT.text3, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t, i) => {
                    const name = `${t.first_name || ''} ${t.last_name || ''}`.trim() || 'Unknown'
                    const status = t.status || 'active'
                    const tone = status === 'active' ? 'success' : status === 'past' ? 'neutral' : 'warn'
                    const statusLabel = status[0].toUpperCase() + status.slice(1)
                    const unitLabel = t.units?.unit_number ? `Unit ${t.units.unit_number}` : '—'
                    const roomLabel = t.rooms?.name ? ` · ${t.rooms.name}` : ''
                    const since = fmtMonth(t.move_in_date)
                    return (
                      <tr key={t.id || i} onClick={() => setSelected(t)} style={{ borderTop: `1px solid ${VT.line}`, cursor: 'pointer' }}>
                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <VAvatar initials={initials(name)} size={38} color={avatarColor(name)} />
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>{name}</div>
                              {since && <div style={{ fontSize: 12, color: VT.text3, fontWeight: 500, marginTop: 1 }}>Since {since}</div>}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: VT.text2, fontWeight: 500 }}><VIcon.Mail s={12} /> {t.email || '—'}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: VT.text2, fontWeight: 500 }}><VIcon.Phone s={12} /> {t.phone || '—'}</div>
                          </div>
                        </td>
                        <td style={{ padding: '16px 20px', fontSize: 13, color: VT.text2, fontWeight: 500 }}>{t.properties?.name || '—'}</td>
                        <td style={{ padding: '16px 20px', fontSize: 13, color: VT.text2, fontWeight: 500 }}>{unitLabel}{roomLabel}</td>
                        <td style={{ padding: '16px 20px' }}><VPill tone={tone}>{statusLabel}</VPill></td>
                        <td style={{ padding: '16px 16px', textAlign: 'right' }}><VIcon.Chevron s={14} c="var(--text-3)" /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
