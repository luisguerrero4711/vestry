import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import Layout from '../components/Layout'
import { isDemoUser, demoLeases } from '../lib/demoData'
import { VT, VIcon, VPill, VAvatar } from '../lib/vestry-shared'
import { leaseStatusTone, leaseStatusLabel } from '../lib/derive'
import NewLeaseModal from '../components/NewLeaseModal'

const AVATAR_COLORS = ['#FF6B6B','#4ECDC4','#FFD93D','#A78BFA','#60A5FA','#34D399','#F472B6','#FB923C']
const avatarColor = (name = '') => AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length]
const initials = (name = '') => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'

function leaseProgress(start, end) {
  const s = new Date(start).getTime(), e = new Date(end).getTime(), now = Date.now()
  if (isNaN(s) || isNaN(e) || e <= s) return 0
  return Math.min(100, Math.max(0, Math.round(((now - s) / (e - s)) * 100)))
}

export default function Leases() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [leases, setLeases] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)

  async function load() {
    if (!user) { navigate('/auth'); return }
    if (isDemoUser(user)) {
      setLeases(demoLeases)
    } else {
      const { data } = await supabase
        .from('leases')
        .select('*, tenants(first_name, last_name), properties(name), units(unit_number)')
        .eq('user_id', user.id)
        .order('start_date', { ascending: false })
      setLeases(data || [])
    }
    setLoading(false)
  }

  useEffect(() => { load() /* eslint-disable-next-line */ }, [user, navigate])

  const activeCount = leases.filter(l => (l.status ?? 'active') === 'active').length

  return (
    <Layout>
      {showNew && (
        <NewLeaseModal
          onClose={() => setShowNew(false)}
          onAdded={(row) => setLeases(prev => [row, ...prev])}
        />
      )}
      <div className="v-page">
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 13, color: VT.text3, fontWeight: 500, marginBottom: 4 }}>{leases.length} leases · {activeCount} active</div>
            <h1 style={{ fontFamily: VT.fontDisplay, fontSize: 30, fontWeight: 600, margin: 0, letterSpacing: '-0.03em', lineHeight: 1.1 }}>Leases</h1>
          </div>
          <button onClick={() => setShowNew(true)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px',
            background: VT.brand, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
            color: '#fff', cursor: 'pointer', boxShadow: '0 1px 2px rgba(37,99,235,0.3)',
          }}><VIcon.Plus s={14} c="#fff" /> New lease</button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: VT.text3, fontWeight: 500 }}>Loading leases…</div>
        ) : leases.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: VT.text3, fontWeight: 500 }}>
            No leases yet. <button onClick={() => setShowNew(true)} style={{ background: 'none', border: 'none', color: VT.brand, fontWeight: 600, cursor: 'pointer' }}>Create the first lease</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {leases.map(l => {
              const name = l.tenants ? `${l.tenants.first_name} ${l.tenants.last_name}`.trim() : (l.tenant || 'Tenant')
              const pct = leaseProgress(l.start_date, l.end_date)
              return (
                <div
                  key={l.id}
                  onClick={() => navigate(`/leases/${l.id}`)}
                  style={{ background: VT.card, borderRadius: 'var(--r-md)', boxShadow: VT.shadowCard, padding: 20, cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                      <VAvatar initials={initials(name)} size={40} color={avatarColor(name)} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontFamily: VT.fontDisplay, fontSize: 15, fontWeight: 600, letterSpacing: '-0.02em' }}>{name}</div>
                        <div style={{ fontSize: 12, color: VT.text2, fontWeight: 500, marginTop: 2 }}>
                          {l.properties?.name || l.property || '—'}{l.units?.unit_number ? ` · Unit ${l.units.unit_number}` : ''}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                      <VPill tone={leaseStatusTone(l)}>{leaseStatusLabel(l)}</VPill>
                      <div style={{ fontFamily: VT.fontDisplay, fontSize: 15, fontWeight: 600, letterSpacing: '-0.02em' }}>${Number(l.monthly_rent || 0).toLocaleString()}/mo</div>
                    </div>
                  </div>
                  <div>
                    <div style={{ position: 'relative', height: 6, background: VT.tint, borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: 'var(--brand)', borderRadius: 999 }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: VT.text3, fontWeight: 500 }}>
                      <span>{l.start_date ? new Date(l.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span>
                      <span>{pct}% complete</span>
                      <span>{l.end_date ? new Date(l.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}
