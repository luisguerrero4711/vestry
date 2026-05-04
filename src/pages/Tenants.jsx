import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import Layout from '../components/Layout'
import { isDemoUser, demoTenants } from '../lib/demoData'
import { VT, VIcon, VPill, VAvatar, VSection } from '../lib/vestry-shared'

const AVATAR_COLORS = ['#FF6B6B','#4ECDC4','#FFD93D','#A78BFA','#60A5FA','#34D399','#F472B6','#FB923C']

function avatarColor(name = '') {
  const idx = (name.charCodeAt(0) || 0) % AVATAR_COLORS.length
  return AVATAR_COLORS[idx]
}

function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
}

export default function Tenants() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!user) { navigate('/auth'); return }
    async function load() {
      if (isDemoUser(user)) {
        setTenants(demoTenants || demoFallback)
      } else {
        const { data } = await supabase.from('tenants').select('*').eq('user_id', user.id).order('name')
        setTenants(data || [])
      }
      setLoading(false)
    }
    load()
  }, [user, navigate])

  const demoFallback = [
    { id: 1, name: 'Sarah Chen',      email: 'sarah.chen@email.com',   phone: '(503) 555-0142', property: 'Oak Street Duplex · Unit A', status: 'active', rent: 1450, onTime: 94 },
    { id: 2, name: 'Marcus Williams', email: 'marcus.w@email.com',     phone: '(503) 555-0187', property: 'Oak Street Duplex · Unit B', status: 'active', rent: 1200, onTime: 88 },
    { id: 3, name: 'Priya Patel',     email: 'priya.p@email.com',      phone: '(503) 555-0293', property: 'Riverside Condo',            status: 'late',   rent: 1800, onTime: 75 },
  ]

  const filtered = tenants.filter(t => {
    const name = t.name || `${t.first_name || ''} ${t.last_name || ''}`.trim()
    return name.toLowerCase().includes(search.toLowerCase()) || (t.email || '').toLowerCase().includes(search.toLowerCase())
  })

  return (
    <Layout>
      <div style={{ padding: '28px 28px 32px', overflow: 'auto', height: '100%', background: VT.page }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 13, color: VT.text3, fontWeight: 500, marginBottom: 4 }}>{tenants.length} tenants · {tenants.filter(t => t.status === 'active' || !t.status).length} active</div>
            <h1 style={{ fontFamily: VT.fontDisplay, fontSize: 30, fontWeight: 600, margin: 0, letterSpacing: '-0.03em', lineHeight: 1.1 }}>Tenants</h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', display: 'flex', pointerEvents: 'none' }}>
                <VIcon.Search s={14} c="var(--text-3)" />
              </div>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search tenants…"
                style={{
                  padding: '8px 12px 8px 32px',
                  background: VT.card, border: `1px solid ${VT.line}`,
                  borderRadius: 8, fontFamily: VT.fontText, fontSize: 13,
                  color: VT.text1, outline: 'none', fontWeight: 500, width: 220,
                }}
              />
            </div>
            <button style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', background: VT.brand, border: 'none',
              borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(37,99,235,0.3)',
            }}><VIcon.Plus s={14} c="#fff" /> Add tenant</button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: VT.text3, fontWeight: 500 }}>Loading tenants…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: VT.text3, fontWeight: 500 }}>No tenants found</div>
        ) : (
          <div style={{ background: VT.card, borderRadius: 'var(--r-md)', boxShadow: VT.shadowCard, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: VT.tint }}>
                  {['Tenant', 'Contact', 'Property', 'Monthly rent', 'On-time', 'Status', ''].map((h, i) => (
                    <th key={i} style={{
                      textAlign: 'left', padding: '10px 20px',
                      fontSize: 11, fontWeight: 600, color: VT.text3,
                      textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, i) => {
                  const name = t.name || `${t.first_name || ''} ${t.last_name || ''}`.trim() || 'Unknown'
                  const email = t.email || '—'
                  const phone = t.phone || t.phone_number || '—'
                  const property = t.property || t.property_name || '—'
                  const rent = t.rent || t.monthly_rent || 0
                  const onTime = t.onTime || t.on_time_rate || '—'
                  const status = t.status || 'active'
                  const tone = status === 'active' ? 'success' : status === 'late' ? 'danger' : 'warn'

                  return (
                    <tr key={t.id || i} style={{ borderTop: `1px solid ${VT.line}`, cursor: 'pointer' }}>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <VAvatar initials={initials(name)} size={38} color={avatarColor(name)} />
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>{name}</div>
                            <div style={{ fontSize: 12, color: VT.text3, fontWeight: 500, marginTop: 1 }}>Since Jul 2023</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: VT.text2, fontWeight: 500 }}>
                            <VIcon.Mail s={12} /> {email}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: VT.text2, fontWeight: 500 }}>
                            <VIcon.Phone s={12} /> {phone}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px', fontSize: 13, color: VT.text2, fontWeight: 500 }}>{property}</td>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontFamily: VT.fontDisplay, fontSize: 15, fontWeight: 600, letterSpacing: '-0.02em' }}>
                          {rent > 0 ? `$${Number(rent).toLocaleString()}` : '—'}
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: typeof onTime === 'number' && onTime >= 90 ? VT.green : VT.amber }}>
                          {typeof onTime === 'number' ? `${onTime}%` : onTime}
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <VPill tone={tone}>{status === 'active' ? 'Active' : status === 'late' ? 'Late' : 'Inactive'}</VPill>
                      </td>
                      <td style={{ padding: '16px 16px', textAlign: 'right' }}>
                        <VIcon.Chevron s={14} c="var(--text-3)" />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  )
}
