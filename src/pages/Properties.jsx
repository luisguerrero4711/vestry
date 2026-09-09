import { useEffect, useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { usePlan } from '../hooks/usePlan'
import Layout from '../components/Layout'
import { isDemoUser, demoProperties, demoLeases } from '../lib/demoData'
import { VT, VIcon, VPill, PropertyThumb } from '../lib/vestry-shared'
import { computeOccupancy, scheduledRent } from '../lib/derive'
import AddPropertyModal from '../components/AddPropertyModal'

function kindFromType(type = '') {
  const t = type.toLowerCase()
  if (t.includes('condo') || t.includes('apartment')) return 'condo'
  if (t.includes('town') || t.includes('multi')) return 'townhome'
  return 'duplex'
}

export default function Properties() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { canAddProperty } = usePlan()
  const [properties, setProperties] = useState([])
  const [leases, setLeases] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    if (!user) { navigate('/auth'); return }
    async function load() {
      if (isDemoUser(user)) {
        setProperties(demoProperties)
        setLeases(demoLeases)
      } else {
        const [{ data: props }, { data: ls }] = await Promise.all([
          supabase.from('properties')
            .select('*, units(id, property_id, bedrooms, bathrooms, sqft, rent_amount)')
            .eq('user_id', user.id).order('created_at', { ascending: false }),
          supabase.from('leases')
            .select('id, property_id, unit_id, status, monthly_rent').eq('user_id', user.id),
        ])
        setProperties(props || [])
        setLeases(ls || [])
      }
      setLoading(false)
    }
    load()
  }, [user, navigate])

  const displayProps = useMemo(() => properties.map((p) => {
    const units = p.units || []
    const occ = computeOccupancy(units, leases.filter(l => l.property_id === p.id))
    const sched = scheduledRent(units, leases.filter(l => l.property_id === p.id))
    const firstUnit = units[0] || {}
    return {
      id: p.id,
      name: p.name || p.address || 'Property',
      addr: [p.address, p.city, p.state].filter(Boolean).join(', ') || '—',
      kind: kindFromType(p.type),
      label: (p.type || 'property').replace('_', ' '),
      units: occ.totalUnits || p.units_count || units.length || 1,
      occupied: occ.occupiedUnits,
      pct: occ.pct,
      monthly: sched || Number(firstUnit.rent_amount) || 0,
      beds: firstUnit.bedrooms || 0,
      baths: firstUnit.bathrooms || 0,
      sqft: firstUnit.sqft || 0,
      valuation: Number(p.market_value) || 0,
    }
  }), [properties, leases])

  const totalMonthly = displayProps.reduce((s, p) => s + p.monthly, 0)
  const totalValue = displayProps.reduce((s, p) => s + p.valuation, 0)
  const totalUnits = displayProps.reduce((s, p) => s + p.units, 0)
  const totalOccupied = displayProps.reduce((s, p) => s + p.occupied, 0)
  const occupancyPct = totalUnits > 0 ? Math.round((totalOccupied / totalUnits) * 100) : 0

  const canAdd = isDemoUser(user) || canAddProperty(properties.length)

  const handlePropertyAdded = (newProp) => setProperties(prev => [newProp, ...prev])

  const summaryTiles = [
    ['Total monthly rent', totalMonthly > 0 ? `$${totalMonthly.toLocaleString()}` : '—', VT.brand],
    ['Portfolio value', totalValue > 0 ? `$${(totalValue / 1e6).toFixed(2)}M` : '—', VT.text1],
    ['Avg occupancy', `${occupancyPct}%`, VT.green],
    ['Units', `${totalOccupied}/${totalUnits}`, VT.amber],
  ]

  return (
    <Layout>
      {showAddModal && (
        <AddPropertyModal
          propertyCount={properties.length}
          onClose={() => setShowAddModal(false)}
          onAdded={handlePropertyAdded}
        />
      )}
      <div className="v-page">
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 13, color: VT.text3, fontWeight: 500, marginBottom: 4 }}>
              {displayProps.length} properties · {totalUnits} units · {occupancyPct}% occupied
            </div>
            <h1 style={{ fontFamily: VT.fontDisplay, fontSize: 30, fontWeight: 600, margin: 0, letterSpacing: '-0.03em', lineHeight: 1.1 }}>Properties</h1>
          </div>
          {canAdd ? (
            <button onClick={() => setShowAddModal(true)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px',
              background: VT.brand, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
              color: '#fff', cursor: 'pointer', boxShadow: '0 1px 2px rgba(37,99,235,0.3)',
            }}><VIcon.Plus s={14} c="#fff" /> Add property</button>
          ) : (
            <Link to="/pricing" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px',
              background: VT.amberTint, borderRadius: 8, fontSize: 13, fontWeight: 600,
              color: VT.amber, textDecoration: 'none',
            }}><VIcon.Lock s={13} c="var(--amber)" /> Upgrade to add more</Link>
          )}
        </div>

        <div className="v-grid-4 v-mb-20" style={{ background: VT.card, borderRadius: 'var(--r-md)', boxShadow: VT.shadowCard, padding: '16px 4px' }}>
          {summaryTiles.map(([l, v, c], i) => (
            <div key={l} style={{ padding: '4px 22px', borderRight: i < 3 ? `1px solid ${VT.line}` : 'none' }}>
              <div style={{ fontSize: 12, color: VT.text2, fontWeight: 500, marginBottom: 4 }}>{l}</div>
              <div style={{ fontFamily: VT.fontNum, fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', color: c }}>{v}</div>
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: VT.text3, fontWeight: 500 }}>Loading properties…</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {displayProps.map(p => (
              <div
                key={p.id}
                onClick={() => navigate(`/properties/${p.id}`)}
                style={{ background: VT.card, borderRadius: 'var(--r-lg)', boxShadow: VT.shadowCard, overflow: 'hidden', display: 'flex', flexDirection: 'column', cursor: 'pointer' }}
              >
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
                    <VPill tone={p.pct >= 100 ? 'success' : p.pct > 0 ? 'warn' : 'neutral'}>{p.pct}% full</VPill>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, color: VT.text2, fontSize: 12, fontWeight: 500, paddingTop: 8, borderTop: `1px solid ${VT.line}` }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><VIcon.Bed s={13} /> {p.beds}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><VIcon.Bath s={13} /> {p.baths}</span>
                    {p.sqft ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><VIcon.Sqft s={13} /> {p.sqft.toLocaleString()} sqft</span> : null}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 4 }}>
                    <div>
                      <div style={{ fontSize: 10, color: VT.text3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Scheduled rent</div>
                      <div style={{ fontFamily: VT.fontNum, fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>
                        {p.monthly > 0 ? `$${p.monthly.toLocaleString()}` : <span style={{ color: VT.text3 }}>—</span>}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: VT.text2, fontWeight: 500 }}>{p.occupied}/{p.units} units</div>
                  </div>
                </div>
              </div>
            ))}

            {canAdd && (
              <div
                onClick={() => setShowAddModal(true)}
                style={{
                  background: 'transparent', border: `1.5px dashed ${VT.lineStrong}`, borderRadius: 'var(--r-lg)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 8, padding: 32, minHeight: 260, cursor: 'pointer',
                }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: VT.card, border: `1px solid ${VT.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <VIcon.Plus s={20} c="var(--text-2)" />
                </div>
                <div style={{ fontFamily: VT.fontDisplay, fontSize: 15, fontWeight: 600, color: VT.text2, letterSpacing: '-0.02em' }}>Add property</div>
                <div style={{ fontSize: 12, color: VT.text3, fontWeight: 500 }}>Building, then its units</div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}
