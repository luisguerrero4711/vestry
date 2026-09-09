import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import Layout from '../components/Layout'
import { isDemoUser, demoRequests, demoRequestComments } from '../lib/demoData'
import { VT, VIcon, VPill, VSection } from '../lib/vestry-shared'
import { toCents, fmtCents } from '../lib/money'
import { STATUS_META, PRIORITY_META } from './Maintenance'

const fmtDate = (d) => d ? new Date((d + '').slice(0, 10) + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
const sel = { padding: '7px 10px', border: `1px solid ${VT.line}`, borderRadius: 8, background: VT.card, color: VT.text1, fontFamily: VT.fontText, fontSize: 13, fontWeight: 600, cursor: 'pointer', outline: 'none' }
const inp = { ...sel, cursor: 'text', fontWeight: 500 }

export default function MaintenanceDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const demo = isDemoUser(user)
  const [r, setR] = useState(null)
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState('')
  const [internal, setInternal] = useState(false)
  const [vendor, setVendor] = useState('')
  const [cost, setCost] = useState('')
  const [savedNote, setSavedNote] = useState('')

  useEffect(() => {
    if (!user) { navigate('/auth'); return }
    async function load() {
      if (demo) {
        const found = demoRequests.find(x => x.id === id) || null
        setR(found)
        setComments(demoRequestComments[id] || [])
      } else {
        const [{ data: req }, { data: cs }] = await Promise.all([
          supabase.from('maintenance_requests').select('*, properties(name), units(unit_number), rooms(name), tenants(first_name, last_name)').eq('id', id).eq('user_id', user.id).single(),
          supabase.from('maintenance_comments').select('*').eq('request_id', id).order('created_at'),
        ])
        setR(req || null)
        setComments(cs || [])
      }
      setLoading(false)
    }
    load()
  }, [user, id, demo, navigate])

  useEffect(() => {
    if (r) { setVendor(r.vendor || ''); setCost(r.cost_cents != null ? String(r.cost_cents / 100) : '') }
  }, [r])

  const patch = async (fields) => {
    setR(prev => ({ ...prev, ...fields }))
    if (!demo) await supabase.from('maintenance_requests').update(fields).eq('id', id)
  }
  const flash = (m) => { setSavedNote(m); setTimeout(() => setSavedNote(''), 2500) }

  const saveVendorCost = async () => {
    await patch({ vendor: vendor.trim() || null, cost_cents: cost === '' ? null : toCents(cost) })
    flash('Saved.')
  }

  const addComment = async () => {
    if (!draft.trim()) return
    const row = { id: `mc-${Date.now()}`, body: draft.trim(), internal, created_at: new Date().toISOString() }
    setComments(prev => [...prev, row])
    setDraft('')
    if (!demo) await supabase.from('maintenance_comments').insert([{ request_id: id, user_id: user.id, body: row.body, internal }])
  }

  const logExpense = async () => {
    const cents = cost === '' ? 0 : toCents(cost)
    if (!cents) { flash('Add a cost first.'); return }
    if (!demo) {
      await supabase.from('expenses').insert([{
        user_id: user.id, property_id: r.property_id, unit_id: r.unit_id || null,
        category: 'maintenance', description: r.title, amount: cents / 100,
        date: new Date().toISOString().slice(0, 10), vendor: vendor.trim() || null,
        notes: `From maintenance request`,
      }])
    }
    await patch({ status: 'resolved' })
    flash('Logged as an expense and marked resolved.')
  }

  if (loading) return <Layout><div className="v-page"><div style={{ textAlign: 'center', padding: 48, color: VT.text3, fontWeight: 500 }}>Loading…</div></div></Layout>
  if (!r) return <Layout><div className="v-page"><div style={{ textAlign: 'center', padding: 48, color: VT.text3, fontWeight: 500 }}>Request not found. <Link to="/maintenance" style={{ color: VT.brand }}>Back</Link></div></div></Layout>

  const sm = STATUS_META[r.status] || { label: r.status, tone: 'neutral' }
  const where = `${r.properties?.name || '—'}${r.units?.unit_number ? ` · Unit ${r.units.unit_number}` : ' · common area'}${r.rooms?.name ? ` · ${r.rooms.name}` : ''}`
  const reporter = r.tenants ? `${r.tenants.first_name} ${r.tenants.last_name}`.trim() : 'Landlord-entered'

  return (
    <Layout>
      <div className="v-page">
        <Link to="/maintenance" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: VT.text3, fontWeight: 600, textDecoration: 'none', marginBottom: 12 }}>
          <VIcon.ChevronLeft s={13} c="var(--text-3)" /> Maintenance
        </Link>
        {savedNote && <div style={{ background: VT.greenTint, color: VT.green, borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 600, marginBottom: 14 }}>{savedNote}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14, maxWidth: 620 }}>
          <div style={{ background: VT.card, borderRadius: 'var(--r-md)', boxShadow: VT.shadowCard, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <VPill tone={sm.tone}>{sm.label}</VPill>
              {r.priority === 'urgent' && <VPill tone="danger">Urgent</VPill>}
            </div>
            <div style={{ fontFamily: VT.fontDisplay, fontSize: 20, fontWeight: 600, letterSpacing: '-0.025em' }}>{r.title}</div>
            <div style={{ fontSize: 13, color: VT.text2, fontWeight: 500, marginTop: 4 }}>{where}</div>
            <div style={{ fontSize: 12, color: VT.text3, fontWeight: 500, marginTop: 4 }}>Reported by {reporter} · opened {fmtDate(r.created_at)}</div>
            {r.description && <div style={{ fontSize: 13, color: VT.text2, fontWeight: 500, marginTop: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{r.description}</div>}
          </div>

          <VSection title="Manage">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: VT.text3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Status</div>
                  <select style={sel} value={r.status} onChange={e => patch({ status: e.target.value })}>
                    {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: VT.text3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Priority</div>
                  <select style={sel} value={r.priority} onChange={e => patch({ priority: e.target.value })}>
                    {Object.entries(PRIORITY_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: VT.text3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Vendor</div>
                  <input style={{ ...inp, width: '100%' }} value={vendor} onChange={e => setVendor(e.target.value)} placeholder="ABC Plumbing" />
                </div>
                <div style={{ width: 120 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: VT.text3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Cost ($)</div>
                  <input style={{ ...inp, width: '100%' }} type="number" min={0} value={cost} onChange={e => setCost(e.target.value)} placeholder="180" />
                </div>
                <button onClick={saveVendorCost} style={{ padding: '8px 14px', background: VT.tint, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, color: VT.text2, cursor: 'pointer' }}>Save</button>
              </div>
              <button onClick={logExpense} style={{ padding: '9px', background: VT.brandTint, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, color: VT.brand, cursor: 'pointer' }}>
                Log {cost ? fmtCents(toCents(cost)) : 'cost'} as an expense &amp; resolve
              </button>
            </div>
          </VSection>

          <VSection title="Updates" subtitle={`${comments.length}`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {comments.length === 0 && <div style={{ fontSize: 13, color: VT.text3, fontWeight: 500 }}>No updates yet.</div>}
              {comments.map(c => (
                <div key={c.id} style={{ borderTop: `1px solid ${VT.line}`, paddingTop: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: VT.text2 }}>{c.internal ? 'Private note' : 'Update'}</span>
                    {c.internal && <VPill tone="neutral">Landlord only</VPill>}
                    <span style={{ fontSize: 11, color: VT.text3, fontWeight: 500, marginLeft: 'auto' }}>{fmtDate(c.created_at)}</span>
                  </div>
                  <div style={{ fontSize: 13, color: VT.text1, fontWeight: 500, lineHeight: 1.5 }}>{c.body}</div>
                </div>
              ))}
              <div style={{ borderTop: `1px solid ${VT.line}`, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <textarea value={draft} onChange={e => setDraft(e.target.value)} placeholder="Add an update…" style={{ ...inp, width: '100%', minHeight: 56, resize: 'vertical' }} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, color: VT.text2, fontWeight: 500 }}>
                    <input type="checkbox" checked={internal} onChange={e => setInternal(e.target.checked)} /> Private note (landlord only)
                  </label>
                  <button onClick={addComment} style={{ padding: '8px 16px', background: VT.brand, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>Post</button>
                </div>
              </div>
            </div>
          </VSection>
        </div>
      </div>
    </Layout>
  )
}
