import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import Layout from '../components/Layout'
import { isDemoUser, demoProperties, demoTenants, demoLeases, demoPayments, demoExpenses, demoRequests } from '../lib/demoData'
import { VT, VIcon, VPill, VAvatar, VSection } from '../lib/vestry-shared'
import {
  computeOccupancy, scheduledRent, activeLeaseForUnit,
  collectedThisMonth, expensesThisMonth, leaseStatusTone, leaseStatusLabel,
} from '../lib/derive'
import UnitsEditor from '../components/UnitsEditor'
import RoomsEditor from '../components/RoomsEditor'
import NewRequestModal from '../components/NewRequestModal'

const money = (n) => `$${Number(n || 0).toLocaleString()}`
const initials = (s = '') => s.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
const fullName = (t) => t ? `${t.first_name || ''} ${t.last_name || ''}`.trim() : ''

export default function PropertyDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [property, setProperty] = useState(null)
  const [units, setUnits] = useState([])
  const [tenants, setTenants] = useState([])
  const [leases, setLeases] = useState([])
  const [payments, setPayments] = useState([])
  const [expenses, setExpenses] = useState([])
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)

  const [unitModal, setUnitModal] = useState(null)   // { unit } | 'new'
  const [roomModal, setRoomModal] = useState(null)   // { unitId, room } | { unitId }
  const [showRequest, setShowRequest] = useState(false)

  const demo = isDemoUser(user)

  async function load() {
    if (!user) { navigate('/auth'); return }
    setLoading(true)

    if (demo) {
      const p = demoProperties.find(x => x.id === id)
      setProperty(p || null)
      setUnits((p?.units || []).map(u => ({ ...u, rooms: u.rooms || [] })))
      setTenants(demoTenants.filter(t => t.property_id === id))
      setLeases(demoLeases.filter(l => l.property_id === id))
      setPayments(demoPayments.filter(x => x.property_id === id))
      setExpenses(demoExpenses.filter(x => x.property_id === id))
      setRequests(demoRequests.filter(x => x.property_id === id))
      setLoading(false)
      return
    }

    const [{ data: p }, { data: u }, { data: t }, { data: l }, { data: pay }, { data: exp }, { data: req }] = await Promise.all([
      supabase.from('properties').select('*').eq('id', id).eq('user_id', user.id).single(),
      supabase.from('units').select('*, rooms(*)').eq('property_id', id).order('unit_number'),
      supabase.from('tenants').select('*').eq('user_id', user.id).eq('property_id', id),
      supabase.from('leases').select('*, tenants(first_name, last_name)').eq('user_id', user.id).eq('property_id', id),
      supabase.from('rent_payments').select('amount, amount_cents, type, state, status, paid_date').eq('user_id', user.id).eq('property_id', id),
      supabase.from('expenses').select('amount, date').eq('user_id', user.id).eq('property_id', id),
      supabase.from('maintenance_requests').select('id, title, status, priority').eq('user_id', user.id).eq('property_id', id).order('created_at', { ascending: false }),
    ])
    setProperty(p || null)
    setUnits((u || []).map(x => ({ ...x, rooms: x.rooms || [] })))
    setTenants(t || [])
    setLeases(l || [])
    setPayments(pay || [])
    setExpenses(exp || [])
    setRequests(req || [])
    setLoading(false)
  }

  useEffect(() => { load() /* eslint-disable-next-line */ }, [user, id])

  const occ = useMemo(() => computeOccupancy(units, leases), [units, leases])
  const sched = useMemo(() => scheduledRent(units, leases), [units, leases])
  const collected = useMemo(() => collectedThisMonth(payments), [payments])
  const spent = useMemo(() => expensesThisMonth(expenses), [expenses])

  // ── unit CRUD wiring
  const onUnitSaved = (row) => {
    setUnits(prev => {
      const exists = prev.some(x => x.id === row.id)
      return exists ? prev.map(x => x.id === row.id ? { ...x, ...row } : x) : [...prev, { ...row, rooms: row.rooms || [] }]
    })
  }
  const deleteUnit = async (unit) => {
    if (!confirm(`Delete unit "${unit.unit_number}"? Its rooms are removed too.`)) return
    if (!demo) await supabase.from('units').delete().eq('id', unit.id)
    setUnits(prev => prev.filter(x => x.id !== unit.id))
  }

  // ── room CRUD wiring
  const onRoomSaved = (unitId, row) => {
    setUnits(prev => prev.map(u => {
      if (u.id !== unitId) return u
      const rooms = u.rooms || []
      const exists = rooms.some(r => r.id === row.id)
      return { ...u, rooms: exists ? rooms.map(r => r.id === row.id ? { ...r, ...row } : r) : [...rooms, row] }
    }))
  }
  const deleteRoom = async (unitId, room) => {
    if (!confirm(`Delete room "${room.name}"?`)) return
    if (!demo) await supabase.from('rooms').delete().eq('id', room.id)
    setUnits(prev => prev.map(u => u.id === unitId ? { ...u, rooms: (u.rooms || []).filter(r => r.id !== room.id) } : u))
    setTenants(prev => prev.map(t => t.room_id === room.id ? { ...t, room_id: null } : t))
  }

  // ── assign a tenant to a room
  const assignTenant = async (unit, room, tenantId) => {
    const prev = tenants.find(t => t.room_id === room.id)
    const updates = []
    if (prev && prev.id !== tenantId) updates.push({ id: prev.id, room_id: null })
    if (tenantId) updates.push({ id: tenantId, room_id: room.id, unit_id: unit.id, property_id: id })

    if (!demo) {
      for (const u of updates) {
        const { id: tid, ...rest } = u
        await supabase.from('tenants').update(rest).eq('id', tid)
      }
    }
    setTenants(prev2 => prev2.map(t => {
      const u = updates.find(x => x.id === t.id)
      return u ? { ...t, ...u } : t
    }))
  }

  if (loading) {
    return <Layout><div className="v-page"><div style={{ textAlign: 'center', padding: 48, color: VT.text3, fontWeight: 500 }}>Loading property…</div></div></Layout>
  }
  if (!property) {
    return <Layout><div className="v-page"><div style={{ textAlign: 'center', padding: 48, color: VT.text3, fontWeight: 500 }}>Property not found. <Link to="/properties" style={{ color: VT.brand }}>Back to properties</Link></div></div></Layout>
  }

  const activeTenants = tenants.filter(t => t.status === 'active' || !t.status)
  const addr = [property.address, property.city, property.state].filter(Boolean).join(', ')

  const kpis = [
    ['Occupancy', `${occ.pct}%`, VT.green, `${occ.occupiedUnits}/${occ.totalUnits} units`],
    ['Scheduled rent', money(sched), VT.text1, 'per month'],
    ['Collected', money(collected), VT.brand, 'this month'],
    ['Expenses', money(spent), VT.amber, 'this month'],
  ]

  return (
    <Layout>
      {unitModal && (
        <UnitsEditor
          propertyId={id}
          unit={unitModal === 'new' ? null : unitModal.unit}
          onClose={() => setUnitModal(null)}
          onSaved={onUnitSaved}
        />
      )}
      {roomModal && (
        <RoomsEditor
          unitId={roomModal.unitId}
          room={roomModal.room || null}
          onClose={() => setRoomModal(null)}
          onSaved={(row) => onRoomSaved(roomModal.unitId, row)}
        />
      )}
      {showRequest && (
        <NewRequestModal
          initialPropertyId={id}
          onClose={() => setShowRequest(false)}
          onAdded={(r) => setRequests(prev => [r, ...prev])}
        />
      )}

      <div className="v-page">
        {/* Breadcrumb + header */}
        <Link to="/properties" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: VT.text3, fontWeight: 600, textDecoration: 'none', marginBottom: 12 }}>
          <VIcon.ChevronLeft s={13} c="var(--text-3)" /> Properties
        </Link>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ minWidth: 0, flex: '1 1 200px' }}>
            <div style={{ fontSize: 13, color: VT.text3, fontWeight: 500, marginBottom: 4 }}>
              {property.type?.replace('_', ' ') || 'Property'}{addr ? ` · ${addr}` : ''}
            </div>
            <h1 style={{ fontFamily: VT.fontDisplay, fontSize: 30, fontWeight: 600, margin: 0, letterSpacing: '-0.03em', lineHeight: 1.1, overflowWrap: 'anywhere' }}>{property.name}</h1>
          </div>
          <button onClick={() => setUnitModal('new')} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', flexShrink: 0,
            background: VT.brand, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
            color: '#fff', cursor: 'pointer', boxShadow: '0 1px 2px rgba(37,99,235,0.3)',
          }}><VIcon.Plus s={14} c="#fff" /> Add unit</button>
        </div>

        {/* KPIs */}
        <div className="v-grid-4 v-mb-20" style={{ background: VT.card, borderRadius: 'var(--r-md)', boxShadow: VT.shadowCard, padding: '16px 4px' }}>
          {kpis.map(([l, v, c, sub], i) => (
            <div key={l} style={{ padding: '4px 22px', borderRight: i < 3 ? `1px solid ${VT.line}` : 'none' }}>
              <div style={{ fontSize: 12, color: VT.text2, fontWeight: 500, marginBottom: 4 }}>{l}</div>
              <div style={{ fontFamily: VT.fontNum, fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', color: c }}>{v}</div>
              <div style={{ fontSize: 11, color: VT.text3, fontWeight: 500, marginTop: 2 }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Units → rooms → tenants */}
        <VSection title="Units & rooms" subtitle={`${units.length} unit${units.length === 1 ? '' : 's'} · ${units.reduce((s, u) => s + (u.rooms?.length || 0), 0)} rooms`}>
          {units.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 28, color: VT.text3, fontWeight: 500, fontSize: 13 }}>
              No units yet. <button onClick={() => setUnitModal('new')} style={{ background: 'none', border: 'none', color: VT.brand, fontWeight: 600, cursor: 'pointer' }}>Add the first unit</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {units.map(unit => {
                const lease = activeLeaseForUnit(unit.id, leases)
                const leaseTenant = lease
                  ? (lease.tenants ? `${lease.tenants.first_name} ${lease.tenants.last_name}` : fullName(tenants.find(t => t.id === lease.tenant_id)))
                  : ''
                return (
                  <div key={unit.id} style={{ border: `1px solid ${VT.line}`, borderRadius: 'var(--r-sm)', overflow: 'hidden' }}>
                    {/* unit header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '12px 14px', background: VT.tint, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                        <div style={{ fontFamily: VT.fontDisplay, fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em' }}>Unit {unit.unit_number}</div>
                        <div style={{ display: 'flex', gap: 12, fontSize: 12, color: VT.text2, fontWeight: 500 }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><VIcon.Bed s={12} /> {unit.bedrooms ?? '—'}</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><VIcon.Bath s={12} /> {unit.bathrooms ?? '—'}</span>
                          {unit.sqft ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><VIcon.Sqft s={12} /> {Number(unit.sqft).toLocaleString()}</span> : null}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {lease
                          ? <VPill tone={leaseStatusTone(lease)}>{leaseTenant || 'Leased'} · {leaseStatusLabel(lease)}</VPill>
                          : <VPill tone="neutral">Vacant</VPill>}
                        <div style={{ fontFamily: VT.fontNum, fontSize: 15, fontWeight: 600 }}>{money(lease?.monthly_rent || unit.rent_amount)}<span style={{ fontSize: 11, color: VT.text3, fontWeight: 500 }}>/mo</span></div>
                        <button onClick={() => setUnitModal({ unit })} title="Edit unit" style={iconBtn}><VIcon.Settings s={13} c={VT.text2} /></button>
                        <button onClick={() => deleteUnit(unit)} title="Delete unit" style={iconBtn}><VIcon.X s={13} c={VT.red} /></button>
                      </div>
                    </div>

                    {/* rooms */}
                    <div style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: (unit.rooms?.length ? 8 : 0) }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: VT.text3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rooms</div>
                        <button onClick={() => setRoomModal({ unitId: unit.id })} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: VT.brand, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                          <VIcon.Plus s={12} c="var(--brand)" /> Add room
                        </button>
                      </div>
                      {(unit.rooms || []).length === 0 ? (
                        <div style={{ fontSize: 12, color: VT.text3, fontWeight: 500, paddingBottom: 4 }}>Whole-unit rental — no individual rooms.</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {unit.rooms.map(room => {
                            const occupant = tenants.find(t => t.room_id === room.id)
                            return (
                              <div key={room.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px', borderTop: `1px solid ${VT.line}`, flexWrap: 'wrap' }}>
                                <div style={{ minWidth: 130, fontSize: 13, fontWeight: 600 }}>{room.name}</div>
                                <div style={{ minWidth: 70, fontFamily: VT.fontNum, fontSize: 14, fontWeight: 600, color: VT.text2 }}>{room.monthly_rent ? money(room.monthly_rent) : '—'}</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 180 }}>
                                  {occupant && <VAvatar initials={initials(fullName(occupant))} size={22} />}
                                  <select
                                    value={occupant?.id || ''}
                                    onChange={e => assignTenant(unit, room, e.target.value)}
                                    style={{ ...selectStyle }}
                                  >
                                    <option value="">— Vacant —</option>
                                    {activeTenants.map(t => <option key={t.id} value={t.id}>{fullName(t)}</option>)}
                                  </select>
                                </div>
                                <button onClick={() => setRoomModal({ unitId: unit.id, room })} title="Edit room" style={iconBtn}><VIcon.Settings s={12} c={VT.text2} /></button>
                                <button onClick={() => deleteRoom(unit.id, room)} title="Delete room" style={iconBtn}><VIcon.X s={12} c={VT.red} /></button>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </VSection>

        {/* Tenants on this property */}
        <div style={{ height: 16 }} />
        <VSection title="Tenants" subtitle={`${activeTenants.length} active`}>
          {tenants.length === 0 ? (
            <div style={{ fontSize: 13, color: VT.text3, fontWeight: 500 }}>No tenants linked to this property.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {tenants.map(t => {
                const unit = units.find(u => u.id === t.unit_id)
                const room = unit?.rooms?.find(r => r.id === t.room_id)
                return (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderTop: `1px solid ${VT.line}` }}>
                    <VAvatar initials={initials(fullName(t))} size={32} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{fullName(t)}</div>
                      <div style={{ fontSize: 12, color: VT.text3, fontWeight: 500 }}>
                        {unit ? `Unit ${unit.unit_number}` : 'Unassigned'}{room ? ` · ${room.name}` : ''}
                      </div>
                    </div>
                    <VPill tone={t.status === 'active' ? 'success' : t.status === 'past' ? 'neutral' : 'warn'}>
                      {(t.status || 'active')[0].toUpperCase() + (t.status || 'active').slice(1)}
                    </VPill>
                  </div>
                )
              })}
            </div>
          )}
        </VSection>

        <div style={{ height: 16 }} />
        <VSection
          title="Maintenance"
          subtitle={`${requests.filter(r => r.status !== 'resolved').length} open`}
          action={<button onClick={() => setShowRequest(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: VT.brand, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}><VIcon.Plus s={12} c="var(--brand)" /> Log a repair</button>}
        >
          {requests.length === 0 ? (
            <div style={{ fontSize: 13, color: VT.text3, fontWeight: 500 }}>No maintenance requests for this property.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {requests.map(r => (
                <Link key={r.id} to={`/maintenance/${r.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 0', borderTop: `1px solid ${VT.line}`, textDecoration: 'none' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: r.status === 'resolved' ? VT.text3 : VT.text1 }}>{r.title}</span>
                  <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {r.priority === 'urgent' && r.status !== 'resolved' && <VPill tone="danger">Urgent</VPill>}
                    <VPill tone={r.status === 'resolved' ? 'success' : r.status === 'new' ? 'brand' : 'warn'}>
                      {r.status === 'in_progress' ? 'In progress' : (r.status || 'new')[0].toUpperCase() + (r.status || 'new').slice(1)}
                    </VPill>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </VSection>
      </div>
    </Layout>
  )
}

const iconBtn = {
  width: 26, height: 26, borderRadius: 7, background: VT.card, border: `1px solid ${VT.line}`,
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
}
const selectStyle = {
  padding: '5px 8px', border: `1px solid ${VT.line}`, borderRadius: 7,
  background: VT.card, color: VT.text1, fontFamily: VT.fontText, fontSize: 12, fontWeight: 500,
  outline: 'none', cursor: 'pointer', maxWidth: 200,
}
