import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import Layout from '../components/Layout'
import { isDemoUser, demoRequests } from '../lib/demoData'
import { VT, VIcon, VPill } from '../lib/vestry-shared'
import NewRequestModal from '../components/NewRequestModal'

export const STATUS_META = {
  new:         { label: 'New',         tone: 'brand' },
  acknowledged:{ label: 'Acknowledged',tone: 'warn' },
  in_progress: { label: 'In progress', tone: 'warn' },
  waiting:     { label: 'Waiting',     tone: 'neutral' },
  resolved:    { label: 'Resolved',    tone: 'success' },
}
export const PRIORITY_META = {
  low:    { label: 'Low',    color: 'var(--text-3)' },
  normal: { label: 'Normal', color: 'var(--text-2)' },
  high:   { label: 'High',   color: 'var(--amber)' },
  urgent: { label: 'Urgent', color: 'var(--red)' },
}
const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'

export default function Maintenance() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [filter, setFilter] = useState('open')

  useEffect(() => {
    if (!user) { navigate('/auth'); return }
    async function load() {
      if (isDemoUser(user)) {
        setRows(demoRequests)
      } else {
        const { data } = await supabase.from('maintenance_requests')
          .select('*, properties(name), units(unit_number), tenants(first_name, last_name)')
          .eq('user_id', user.id).order('created_at', { ascending: false })
        setRows(data || [])
      }
      setLoading(false)
    }
    load()
  }, [user, navigate])

  const shown = useMemo(() => {
    if (filter === 'open') return rows.filter(r => r.status !== 'resolved')
    if (filter === 'resolved') return rows.filter(r => r.status === 'resolved')
    return rows
  }, [rows, filter])

  const openCount = rows.filter(r => r.status !== 'resolved').length
  const urgentCount = rows.filter(r => r.status !== 'resolved' && r.priority === 'urgent').length

  return (
    <Layout>
      {showNew && (
        <NewRequestModal onClose={() => setShowNew(false)} onAdded={(r) => setRows(prev => [r, ...prev])} />
      )}
      <div className="v-page">
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 13, color: VT.text3, fontWeight: 500, marginBottom: 4 }}>
              {openCount} open{urgentCount ? ` · ${urgentCount} urgent` : ''}
            </div>
            <h1 style={{ fontFamily: VT.fontDisplay, fontSize: 30, fontWeight: 600, margin: 0, letterSpacing: '-0.03em', lineHeight: 1.1 }}>Maintenance</h1>
          </div>
          <button onClick={() => setShowNew(true)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px',
            background: VT.brand, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
            color: '#fff', cursor: 'pointer', boxShadow: '0 1px 2px rgba(37,99,235,0.3)',
          }}><VIcon.Plus s={14} c="#fff" /> New request</button>
        </div>

        <div style={{ display: 'flex', gap: 4, padding: 4, background: VT.tint, borderRadius: 10, marginBottom: 16, width: 'fit-content' }}>
          {[['open', 'Open'], ['resolved', 'Resolved'], ['all', 'All']].map(([k, label]) => (
            <button key={k} onClick={() => setFilter(k)} style={{
              padding: '5px 12px', border: 'none', cursor: 'pointer',
              background: filter === k ? VT.card : 'transparent', color: filter === k ? VT.text1 : VT.text2,
              fontSize: 12, fontWeight: 600, borderRadius: 7, boxShadow: filter === k ? VT.shadowCard : 'none',
            }}>{label}</button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: VT.text3, fontWeight: 500 }}>Loading…</div>
        ) : shown.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: VT.text3, fontWeight: 500 }}>
            {filter === 'open' ? 'Nothing open — nice.' : 'No requests.'} <button onClick={() => setShowNew(true)} style={{ background: 'none', border: 'none', color: VT.brand, fontWeight: 600, cursor: 'pointer' }}>Log a request</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {shown.map(r => {
              const sm = STATUS_META[r.status] || { label: r.status, tone: 'neutral' }
              const pm = PRIORITY_META[r.priority] || PRIORITY_META.normal
              const where = `${r.properties?.name || '—'}${r.units?.unit_number ? ` · Unit ${r.units.unit_number}` : ' · common area'}`
              return (
                <div key={r.id} onClick={() => navigate(`/maintenance/${r.id}`)} style={{
                  background: VT.card, borderRadius: 'var(--r-md)', boxShadow: VT.shadowCard, padding: '16px 18px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: VT.fontDisplay, fontSize: 15, fontWeight: 600, letterSpacing: '-0.02em' }}>{r.title}</span>
                      {r.priority === 'urgent' && <VPill tone="danger">Urgent</VPill>}
                    </div>
                    <div style={{ fontSize: 12, color: VT.text3, fontWeight: 500, marginTop: 2 }}>
                      {where} · opened {fmtDate((r.created_at || '').slice(0, 10))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: pm.color }}>{pm.label}</span>
                    <VPill tone={sm.tone}>{sm.label}</VPill>
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
