import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import Layout from '../components/Layout'
import { isDemoUser, demoProperties } from '../lib/demoData'
import { VT, VIcon, VPill, VAvatar, PropertyThumb } from '../lib/vestry-shared'

// Map demo property type to thumb kind
function kindFromType(type = '') {
  const t = type.toLowerCase()
  if (t.includes('condo') || t.includes('apartment')) return 'condo'
  if (t.includes('town') || t.includes('multi')) return 'townhome'
  return 'duplex'
}

export default function Properties() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { navigate('/auth'); return }
    async function load() {
      if (isDemoUser(user)) {
        setProperties(demoProperties)
      } else {
        const { data } = await supabase.from('properties').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
        setProperties(data || [])
      }
      setLoading(false)
    }
    load()
  }, [user, navigate])

  // Build display props from data
  const displayProps = properties.map((p, i) => ({
    id: p.id || i,
    name: p.name || p.address || 'Property',
    addr: [p.address, p.city, p.state].filter(Boolean).join(', ') || '—',
    kind: kindFromType(p.property_type),
    label: p.property_type || 'Property',
    units: p.units || 1,
    occupied: p.occupied_units ?? 1,
    monthly: Number(p.monthly_rent) || 0,
    beds: p.bedrooms || 2,
    baths: p.bathrooms || 1,
    sqft: p.square_feet || 1000,
    tenants: [],
    health: 'success',
    healthLabel: 'On track',
    valuation: p.market_value || 0,
  }))

  const totalMonthly = displayProps.reduce((s, p) => s + p.monthly, 0)
  const totalValue = displayProps.reduce((s, p) => s + p.valuation, 0)
  const totalUnits = displayProps.reduce((s, p) => s + p.units, 0)
  const totalOccupied = displayProps.reduce((s, p) => s + p.occupied, 0)
  const occupancyPct = totalUnits > 0 ? Math.round((totalOccupied / totalUnits) * 100) : 0

  return (
    <Layout>
      <div style={{ padding: '28px 28px 32px', overflow: 'auto', height: '100%', background: VT.page }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 13, color: VT.text3, fontWeight: 500, marginBottom: 4 }}>
              {displayProps.length} properties · {totalUnits} units · {occupancyPct}% occupied
            </div>
            <h1 style={{ fontFamily: VT.fontDisplay, fontSize: 30, fontWeight: 600, margin: 0, letterSpacing: '-0.03em', lineHeight: 1.1 }}>Properties</h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 12px', background: VT.card, border: `1px solid ${VT.line}`,
              borderRadius: 8, fontSize: 13, fontWeight: 500, color: VT.text2, cursor: 'pointer',
            }}><VIcon.Filter s={14} /> Filter</button>
            <div style={{ display: 'flex', gap: 4, padding: 4, background: VT.tint, borderRadius: 10 }}>
              {['Grid', 'List'].map((p, i) => (
                <button key={p} style={{
                  padding: '5px 12px', border: 'none', cursor: 'pointer',
                  background: i === 0 ? VT.card : 'transparent',
                  color: i === 0 ? VT.text1 : VT.text2,
                  fontSize: 12, fontWeight: 600, borderRadius: 7,
                  boxShadow: i === 0 ? VT.shadowCard : 'none',
                }}>{p}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Summary strip */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          background: VT.card, borderRadius: 'var(--r-md)', boxShadow: VT.shadowCard,
          padding: '16px 4px', marginBottom: 20,
        }}>
          {[
            ['Total monthly rent', totalMonthly > 0 ? `$${totalMonthly.toLocaleString()}` : '—', VT.brand],
            ['Portfolio value',    totalValue > 0 ? `$${(totalValue / 1e6).toFixed(2)}M` : '—', VT.text1],
            ['Avg occupancy',      `${occupancyPct}%`, VT.green],
            ['Open maintenance',   '2 items', VT.amber],
          ].map(([l, v, c], i) => (
            <div key={l} style={{ padding: '4px 22px', borderRight: i < 3 ? `1px solid ${VT.line}` : 'none' }}>
              <div style={{ fontSize: 12, color: VT.text2, fontWeight: 500, marginBottom: 4 }}>{l}</div>
              <div style={{ fontFamily: VT.fontDisplay, fontSize: 20, fontWeight: 600, letterSpacing: '-0.025em', color: c }}>{v}</div>
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: VT.text3, fontWeight: 500 }}>Loading properties…</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {displayProps.map(p => (
              <div key={p.id} style={{
                background: VT.card, borderRadius: 'var(--r-lg)',
                boxShadow: VT.shadowCard, overflow: 'hidden',
                display: 'flex', flexDirection: 'column', cursor: 'pointer',
              }}>
                <div style={{ padding: 12, paddingBottom: 0 }}>
                  <PropertyThumb kind={p.kind} label={p.label} />
                </div>
                <div style={{ padding: '14px 18px 18px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: VT.fontDisplay, fontSize: 15, fontWeight: 600, letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: VT.text3, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <VIcon.MapPin s={11} c="var(--text-3)" />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.addr}</span>
                      </div>
                    </div>
                    <VPill tone={p.health}>{p.healthLabel}</VPill>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, color: VT.text2, fontSize: 12, fontWeight: 500, paddingTop: 8, borderTop: `1px solid ${VT.line}` }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><VIcon.Bed s={13} /> {p.beds}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><VIcon.Bath s={13} /> {p.baths}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><VIcon.Sqft s={13} /> {p.sqft.toLocaleString()} sqft</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 4 }}>
                    <div>
                      <div style={{ fontSize: 10, color: VT.text3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Monthly rent</div>
                      <div style={{ fontFamily: VT.fontDisplay, fontSize: 20, fontWeight: 600, letterSpacing: '-0.025em' }}>
                        {p.monthly > 0 ? `$${p.monthly.toLocaleString()}` : <span style={{ color: VT.text3 }}>—</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: VT.text2, fontWeight: 500 }}>
                      <span>{p.occupied}/{p.units} units</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Add property */}
            <div
              onClick={() => navigate('/properties/new')}
              style={{
                background: 'transparent',
                border: `1.5px dashed ${VT.lineStrong}`,
                borderRadius: 'var(--r-lg)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 8, padding: 32, minHeight: 260, cursor: 'pointer',
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12, background: VT.card,
                border: `1px solid ${VT.line}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <VIcon.Plus s={20} c="var(--text-2)" />
              </div>
              <div style={{ fontFamily: VT.fontDisplay, fontSize: 15, fontWeight: 600, color: VT.text2, letterSpacing: '-0.02em' }}>Add property</div>
              <div style={{ fontSize: 12, color: VT.text3, fontWeight: 500 }}>Import or create new</div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
