import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import Layout from '../components/Layout'
import { isDemoUser } from '../lib/demoData'
import { VT, VIcon, VPill, VAvatar, VSection } from '../lib/vestry-shared'

const AVATAR_COLORS = ['#FF6B6B','#4ECDC4','#FFD93D','#A78BFA','#60A5FA','#34D399','#F472B6','#FB923C']

function avatarColor(name = '') {
  return AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length]
}

function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
}

function leaseProgress(start, end) {
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  const now = Date.now()
  if (isNaN(s) || isNaN(e) || e <= s) return 0
  return Math.min(100, Math.max(0, Math.round(((now - s) / (e - s)) * 100)))
}

function daysRemaining(end) {
  const e = new Date(end).getTime()
  const diff = Math.round((e - Date.now()) / 86400000)
  return diff > 0 ? diff : 0
}

function statusTone(lease) {
  if (!lease.end_date) return 'neutral'
  const days = daysRemaining(lease.end_date)
  if (days <= 60) return 'warn'
  if (days <= 0) return 'danger'
  return 'success'
}

const demoLeases = [
  {
    id: 1,
    ref: 'LSE-2025-0118',
    tenant: 'Sarah Chen',
    property: 'Oak Street Duplex · Unit A',
    addr: '418 Oak St, Unit A · Portland, OR',
    start_date: '2025-07-01',
    end_date: '2026-06-30',
    monthly_rent: 1450,
    deposit: 1800,
    status: 'active',
  },
  {
    id: 2,
    ref: 'LSE-2024-0072',
    tenant: 'Marcus Williams',
    property: 'Oak Street Duplex · Unit B',
    addr: '418 Oak St, Unit B · Portland, OR',
    start_date: '2024-08-01',
    end_date: '2026-07-31',
    monthly_rent: 1200,
    deposit: 1500,
    status: 'active',
  },
  {
    id: 3,
    ref: 'LSE-2025-0203',
    tenant: 'Priya Patel',
    property: 'Riverside Condo',
    addr: '22 Marina Blvd #14 · Portland, OR',
    start_date: '2025-05-01',
    end_date: '2026-04-30',
    monthly_rent: 1800,
    deposit: 2200,
    status: 'active',
  },
]

export default function Leases() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [leases, setLeases] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    if (!user) { navigate('/auth'); return }
    async function load() {
      if (isDemoUser(user)) {
        setLeases(demoLeases)
        setSelected(demoLeases[0])
      } else {
        const { data } = await supabase.from('leases').select('*').eq('user_id', user.id).order('start_date', { ascending: false })
        const ls = data || []
        setLeases(ls)
        if (ls.length > 0) setSelected(ls[0])
      }
      setLoading(false)
    }
    load()
  }, [user, navigate])

  const lease = selected

  return (
    <Layout>
      <div className="v-page">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 13, color: VT.text3, fontWeight: 500, marginBottom: 4 }}>{leases.length} active leases</div>
            <h1 style={{ fontFamily: VT.fontDisplay, fontSize: 30, fontWeight: 600, margin: 0, letterSpacing: '-0.03em', lineHeight: 1.1 }}>Leases</h1>
          </div>
          <button style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', background: VT.brand, border: 'none',
            borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(37,99,235,0.3)',
          }}><VIcon.Plus s={14} c="#fff" /> New lease</button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: VT.text3, fontWeight: 500 }}>Loading leases…</div>
        ) : (
          <div className={lease ? 'v-detail-row' : ''} style={{ display: 'grid', gap: 16 }}>
            {/* Lease list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {leases.map(l => {
                const pct = leaseProgress(l.start_date, l.end_date)
                const days = daysRemaining(l.end_date)
                const tone = statusTone(l)
                const isSelected = selected?.id === l.id

                return (
                  <div
                    key={l.id}
                    onClick={() => setSelected(l)}
                    style={{
                      background: VT.card, borderRadius: 'var(--r-md)', boxShadow: VT.shadowCard,
                      padding: 20, cursor: 'pointer',
                      outline: isSelected ? `2px solid var(--brand)` : 'none',
                      outlineOffset: 1,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <VAvatar initials={initials(l.tenant || l.tenant_name || 'T')} size={40} color={avatarColor(l.tenant || l.tenant_name || 'T')} />
                        <div>
                          <div style={{ fontFamily: VT.fontDisplay, fontSize: 15, fontWeight: 600, letterSpacing: '-0.02em' }}>{l.tenant || l.tenant_name || 'Tenant'}</div>
                          <div style={{ fontSize: 12, color: VT.text2, fontWeight: 500, marginTop: 2 }}>{l.property || l.property_name || '—'}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                        <VPill tone={tone}>{days <= 60 ? `${days}d left` : 'Active'}</VPill>
                        <div style={{ fontFamily: VT.fontDisplay, fontSize: 15, fontWeight: 600, letterSpacing: '-0.02em' }}>
                          ${Number(l.monthly_rent || 0).toLocaleString()}/mo
                        </div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div>
                      <div style={{ position: 'relative', height: 6, background: VT.tint, borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{
                          position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`,
                          background: `linear-gradient(90deg, var(--brand), oklch(0.55 0.22 280))`,
                          borderRadius: 999,
                        }} />
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

              {leases.length === 0 && (
                <div style={{ textAlign: 'center', padding: 48, color: VT.text3, fontWeight: 500 }}>No leases yet</div>
              )}
            </div>

            {/* Detail panel */}
            {lease && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Header card */}
                <div style={{ background: VT.card, borderRadius: 'var(--r-md)', boxShadow: VT.shadowCard, padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{
                      fontFamily: VT.fontMono, fontSize: 11, fontWeight: 600, color: VT.text3,
                      background: VT.tint, padding: '3px 7px', borderRadius: 5,
                    }}>{lease.ref || 'LSE-—'}</span>
                    <VPill tone={statusTone(lease)}>
                      {daysRemaining(lease.end_date) <= 60 ? `${daysRemaining(lease.end_date)}d left` : 'Active'}
                    </VPill>
                  </div>
                  <div style={{ fontFamily: VT.fontDisplay, fontSize: 18, fontWeight: 600, letterSpacing: '-0.025em', marginBottom: 4 }}>
                    12-month residential lease
                  </div>
                  <div style={{ fontSize: 13, color: VT.text2, fontWeight: 500 }}>
                    {lease.tenant || lease.tenant_name} · {lease.addr || lease.property || '—'}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                    <button style={{
                      flex: 1, padding: '8px', background: VT.tint, border: 'none',
                      borderRadius: 8, fontSize: 13, fontWeight: 600, color: VT.text1, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}><VIcon.Download s={13} /> PDF</button>
                    <button style={{
                      flex: 1, padding: '8px', background: VT.brand, border: 'none',
                      borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      boxShadow: '0 1px 2px rgba(37,99,235,0.3)',
                    }}><VIcon.Sparkle s={13} c="#fff" /> Renew</button>
                  </div>
                </div>

                <VSection title="Parties">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                      <div style={{ fontSize: 11, color: VT.text3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Landlord</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <VAvatar initials="LG" size={34} color="#A78BFA" />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em' }}>Luis Guerrero</div>
                          <div style={{ fontSize: 11, color: VT.text3, fontWeight: 500 }}>Owner</div>
                        </div>
                      </div>
                    </div>
                    <div style={{ height: 1, background: VT.line }} />
                    <div>
                      <div style={{ fontSize: 11, color: VT.text3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Tenant</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <VAvatar initials={initials(lease.tenant || lease.tenant_name || 'T')} size={34} color={avatarColor(lease.tenant || lease.tenant_name || 'T')} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em' }}>{lease.tenant || lease.tenant_name || 'Tenant'}</div>
                          <div style={{ fontSize: 11, color: VT.text3, fontWeight: 500 }}>Primary occupant</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </VSection>

                <VSection title="Financials">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[
                      ['Monthly rent', `$${Number(lease.monthly_rent || 0).toLocaleString()}`],
                      ['Security deposit', `$${Number(lease.deposit || 0).toLocaleString()}`],
                      ['Late fee', '$50 after 5 days'],
                      ['Rent escalation', 'None'],
                    ].map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                        <span style={{ fontSize: 12, color: VT.text3, fontWeight: 500 }}>{k}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: VT.text1, letterSpacing: '-0.01em' }}>{v}</span>
                      </div>
                    ))}
                    <div style={{ borderTop: `1px solid ${VT.line}`, paddingTop: 10, marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>Lease value</span>
                      <span style={{ fontFamily: VT.fontDisplay, fontSize: 15, fontWeight: 600, letterSpacing: '-0.02em' }}>
                        ${(Number(lease.monthly_rent || 0) * 12).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </VSection>

                <VSection title="Key terms">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[
                      ['Term length', '12 months'],
                      ['Renewal', 'Auto · month-to-month'],
                      ['Notice to vacate', '30 days'],
                      ['Pets', 'Per agreement'],
                      ['Smoking', 'Not permitted'],
                    ].map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                        <span style={{ fontSize: 12, color: VT.text3, fontWeight: 500 }}>{k}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: VT.text1, letterSpacing: '-0.01em', textAlign: 'right' }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </VSection>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}
