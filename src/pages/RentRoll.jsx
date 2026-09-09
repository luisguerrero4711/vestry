import { useEffect, useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import Layout from '../components/Layout'
import { isDemoUser, demoProperties, demoLeases, demoTenants } from '../lib/demoData'
import { VT, VIcon, VPill } from '../lib/vestry-shared'
import { buildRentRoll } from '../lib/derive'

const money = (n) => `$${Number(n || 0).toLocaleString()}`

export default function RentRoll() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [properties, setProperties] = useState([])
  const [leases, setLeases] = useState([])
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(true)
  const [propFilter, setPropFilter] = useState('all')

  useEffect(() => {
    if (!user) { navigate('/auth'); return }
    async function load() {
      if (isDemoUser(user)) {
        setProperties(demoProperties)
        setLeases(demoLeases)
        setTenants(demoTenants)
        setLoading(false)
        return
      }
      const [{ data: p }, { data: l }, { data: t }] = await Promise.all([
        supabase.from('properties')
          .select('id, name, units(id, property_id, unit_number, bedrooms, bathrooms, rent_amount, rooms(id))')
          .eq('user_id', user.id).order('name'),
        supabase.from('leases').select('*').eq('user_id', user.id),
        supabase.from('tenants').select('id, first_name, last_name, unit_id, status').eq('user_id', user.id),
      ])
      setProperties(p || [])
      setLeases(l || [])
      setTenants(t || [])
      setLoading(false)
    }
    load()
  }, [user, navigate])

  const rows = useMemo(() => {
    const all = buildRentRoll(properties, leases, tenants)
    return propFilter === 'all' ? all : all.filter(r => r.propertyId === propFilter)
  }, [properties, leases, tenants, propFilter])

  const totalScheduled = rows.reduce((s, r) => s + r.scheduledRent, 0)
  const occupied = rows.filter(r => r.occupied).length
  const pct = rows.length ? Math.round((occupied / rows.length) * 100) : 0

  return (
    <Layout>
      <div className="v-page">
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 13, color: VT.text3, fontWeight: 500, marginBottom: 4 }}>
              {rows.length} units · {occupied} occupied ({pct}%) · {money(totalScheduled)}/mo scheduled
            </div>
            <h1 style={{ fontFamily: VT.fontDisplay, fontSize: 30, fontWeight: 600, margin: 0, letterSpacing: '-0.03em', lineHeight: 1.1 }}>Rent Roll</h1>
          </div>
          <select value={propFilter} onChange={e => setPropFilter(e.target.value)} style={{
            padding: '8px 12px', border: `1px solid ${VT.line}`, borderRadius: 8,
            background: VT.card, color: VT.text1, fontFamily: VT.fontText, fontSize: 13, fontWeight: 500, cursor: 'pointer', outline: 'none',
          }}>
            <option value="all">All properties</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: VT.text3, fontWeight: 500 }}>Loading rent roll…</div>
        ) : rows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: VT.text3, fontWeight: 500 }}>
            No units yet. Add a property with units to see the rent roll.
          </div>
        ) : (
          <div style={{ background: VT.card, borderRadius: 'var(--r-md)', boxShadow: VT.shadowCard, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
                <thead>
                  <tr style={{ background: VT.tint }}>
                    {['Property', 'Unit', 'Beds / Baths', 'Scheduled rent', 'Occupant', 'Lease', ''].map((h, i) => (
                      <th key={i} style={{ textAlign: 'left', padding: '10px 20px', fontSize: 11, fontWeight: 600, color: VT.text3, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.unitId || i} style={{ borderTop: `1px solid ${VT.line}` }}>
                      <td style={{ padding: '14px 20px', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
                        <Link to={`/properties/${r.propertyId}`} style={{ color: VT.text1, textDecoration: 'none' }}>{r.propertyName}</Link>
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: 13, color: VT.text2, fontWeight: 500, whiteSpace: 'nowrap' }}>
                        Unit {r.unitNumber}{r.roomCount ? ` · ${r.roomCount} rooms` : ''}
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: 13, color: VT.text2, fontWeight: 500 }}>
                        {(r.beds ?? '—')} bd / {(r.baths ?? '—')} ba
                      </td>
                      <td style={{ padding: '14px 20px', fontFamily: VT.fontNum, fontSize: 15, fontWeight: 600 }}>{money(r.scheduledRent)}</td>
                      <td style={{ padding: '14px 20px', fontSize: 13, color: r.occupantName ? VT.text1 : VT.text3, fontWeight: 500 }}>{r.occupantName || 'Vacant'}</td>
                      <td style={{ padding: '14px 20px' }}>
                        {r.occupied
                          ? <VPill tone={r.leaseStatus === 'expired' ? 'neutral' : 'success'}>{r.leaseStatus === 'expired' ? 'Expired' : 'Active'}{r.leaseEnd ? ` · ends ${new Date(r.leaseEnd).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}` : ''}</VPill>
                          : <VPill tone={r.roomCount ? 'warn' : 'neutral'}>{r.roomCount ? 'By room' : 'Vacant'}</VPill>}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        {r.leaseId
                          ? <Link to={`/leases/${r.leaseId}`} style={{ color: VT.text3 }}><VIcon.Chevron s={14} c="var(--text-3)" /></Link>
                          : <Link to={`/properties/${r.propertyId}`} style={{ color: VT.text3 }}><VIcon.Chevron s={14} c="var(--text-3)" /></Link>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
