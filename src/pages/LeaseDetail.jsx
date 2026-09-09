import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import Layout from '../components/Layout'
import { isDemoUser, demoLeases, demoPayments } from '../lib/demoData'
import { VT, VIcon, VPill, VAvatar, VSection } from '../lib/vestry-shared'
import { leaseStatusTone, leaseStatusLabel, leaseBalanceCents, depositHeldCents } from '../lib/derive'
import { fmtCents, rowCents, toCents } from '../lib/money'
import EndLeaseModal from '../components/EndLeaseModal'

const money = (n) => fmtCents(toCents(n))
const initials = (s = '') => s.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

function termLength(start, end) {
  if (!start || !end) return '—'
  const s = new Date(start), e = new Date(end)
  const months = Math.round((e - s) / (30.44 * 86400000))
  if (months >= 12 && months % 12 === 0) return `${months / 12} year${months === 12 ? '' : 's'}`
  return `${months} months`
}

export default function LeaseDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [lease, setLease] = useState(null)
  const [landlord, setLandlord] = useState(null)
  const [payments, setPayments] = useState([])
  const [showEnd, setShowEnd] = useState(false)
  const [loading, setLoading] = useState(true)
  const demo = isDemoUser(user)

  useEffect(() => {
    if (!user) { navigate('/auth'); return }
    async function load() {
      if (demo) {
        setLease(demoLeases.find(l => l.id === id) || null)
        setLandlord({ full_name: 'Demo Landlord', email: user.email })
        setPayments(demoPayments.filter(p => p.lease_id === id))
        setLoading(false)
        return
      }
      const [{ data: l }, { data: prof }] = await Promise.all([
        supabase.from('leases')
          .select('*, tenants(first_name, last_name, email, phone), properties(name, address, city, state), units(unit_number)')
          .eq('id', id).eq('user_id', user.id).single(),
        supabase.from('profiles').select('full_name, email').eq('id', user.id).single(),
      ])
      setLease(l || null)
      setLandlord(prof || { email: user.email })
      if (l) {
        const { data: pays } = await supabase.from('rent_payments')
          .select('*').eq('lease_id', l.id).order('due_date', { ascending: false })
        setPayments(pays || [])
      }
      setLoading(false)
    }
    load()
  }, [user, id, demo, navigate])

  if (loading) return <Layout><div className="v-page"><div style={{ textAlign: 'center', padding: 48, color: VT.text3, fontWeight: 500 }}>Loading lease…</div></div></Layout>
  if (!lease) return <Layout><div className="v-page"><div style={{ textAlign: 'center', padding: 48, color: VT.text3, fontWeight: 500 }}>Lease not found. <Link to="/leases" style={{ color: VT.brand }}>Back to leases</Link></div></div></Layout>

  const tenantName = lease.tenants ? `${lease.tenants.first_name} ${lease.tenants.last_name}`.trim() : 'Tenant'
  const propName = lease.properties?.name || '—'
  const unitLabel = lease.units?.unit_number ? ` · Unit ${lease.units.unit_number}` : ''
  const landlordName = landlord?.full_name || landlord?.email || 'Owner'
  const months = (() => {
    if (!lease.start_date || !lease.end_date) return 12
    return Math.max(1, Math.round((new Date(lease.end_date) - new Date(lease.start_date)) / (30.44 * 86400000)))
  })()
  const balanceCents = leaseBalanceCents(lease, payments)

  return (
    <Layout>
      {showEnd && (
        <EndLeaseModal
          lease={lease}
          onClose={() => setShowEnd(false)}
          onEnded={(fields) => setLease(l => ({ ...l, ...fields }))}
        />
      )}
      <div className="v-page">
        <Link to="/leases" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: VT.text3, fontWeight: 600, textDecoration: 'none', marginBottom: 12 }}>
          <VIcon.ChevronLeft s={13} c="var(--text-3)" /> Leases
        </Link>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14, maxWidth: 560 }}>
          {/* header */}
          <div style={{ background: VT.card, borderRadius: 'var(--r-md)', boxShadow: VT.shadowCard, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <VPill tone={leaseStatusTone(lease)}>{leaseStatusLabel(lease)}</VPill>
            </div>
            <div style={{ fontFamily: VT.fontDisplay, fontSize: 18, fontWeight: 600, letterSpacing: '-0.025em', marginBottom: 4 }}>
              {termLength(lease.start_date, lease.end_date)} lease
            </div>
            <div style={{ fontSize: 13, color: VT.text2, fontWeight: 500 }}>{tenantName} · {propName}{unitLabel}</div>
            <div style={{ fontSize: 12, color: VT.text3, fontWeight: 500, marginTop: 6 }}>{fmtDate(lease.start_date)} → {fmtDate(lease.end_date)}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button
                onClick={() => lease.pdf_url ? window.open(lease.pdf_url, '_blank') : null}
                disabled={!lease.pdf_url}
                style={{ flex: 1, padding: '8px', background: VT.tint, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, color: lease.pdf_url ? VT.text1 : VT.text3, cursor: lease.pdf_url ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              ><VIcon.Download s={13} /> {lease.pdf_url ? 'View PDF' : 'No PDF'}</button>
              {(lease.status ?? 'active') === 'active' && (
                <button
                  onClick={() => setShowEnd(true)}
                  style={{ flex: 1, padding: '8px', background: VT.redTint, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, color: VT.red, cursor: 'pointer' }}
                >End lease</button>
              )}
            </div>
          </div>

          <VSection title="Parties">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ fontSize: 11, color: VT.text3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Landlord</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <VAvatar initials={initials(landlordName)} size={34} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{landlordName}</div>
                    <div style={{ fontSize: 11, color: VT.text3, fontWeight: 500 }}>{landlord?.email || 'Owner'}</div>
                  </div>
                </div>
              </div>
              <div style={{ height: 1, background: VT.line }} />
              <div>
                <div style={{ fontSize: 11, color: VT.text3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Tenant</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <VAvatar initials={initials(tenantName)} size={34} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{tenantName}</div>
                    <div style={{ fontSize: 11, color: VT.text3, fontWeight: 500 }}>{lease.tenants?.email || lease.tenants?.phone || 'Primary leaseholder'}</div>
                  </div>
                </div>
              </div>
            </div>
          </VSection>

          <VSection title="Financials">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                ['Monthly rent', money(lease.monthly_rent)],
                (lease.opening_balance_cents > 0) && ['Opening balance', fmtCents(lease.opening_balance_cents)],
                ['Deposit held', fmtCents(depositHeldCents(lease, payments))],
                ['Term length', termLength(lease.start_date, lease.end_date)],
                ['Lease value', fmtCents(toCents(Number(lease.monthly_rent || 0) * months))],
              ].filter(Boolean).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                  <span style={{ fontSize: 12, color: VT.text3, fontWeight: 500 }}>{k}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: VT.text1 }}>{v}</span>
                </div>
              ))}
              <div style={{ borderTop: `1px solid ${VT.line}`, paddingTop: 10, marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Balance due</span>
                <span style={{ fontFamily: VT.fontNum, fontSize: 18, fontWeight: 600, color: balanceCents > 0 ? VT.red : VT.green }}>{fmtCents(balanceCents)}</span>
              </div>
            </div>
          </VSection>

          {lease.notes && (
            <VSection title="Notes & terms">
              <div style={{ fontSize: 13, color: VT.text2, fontWeight: 500, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{lease.notes}</div>
            </VSection>
          )}

          <VSection title="Payment history" subtitle={`${payments.length} recorded`}>
            {payments.length === 0 ? (
              <div style={{ fontSize: 13, color: VT.text3, fontWeight: 500 }}>No payments recorded against this lease yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {payments.map(p => {
                  const rev = p.state === 'reversed'
                  const typeLabel = p.type && p.type !== 'rent' ? ` · ${p.type}` : ''
                  return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 0', borderTop: `1px solid ${VT.line}`, opacity: rev ? 0.55 : 1 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, textDecoration: rev ? 'line-through' : 'none' }}>{fmtCents(rowCents(p))}{typeLabel}</div>
                      <div style={{ fontSize: 11, color: VT.text3, fontWeight: 500 }}>Due {fmtDate(p.due_date)}{p.paid_date ? ` · paid ${fmtDate(p.paid_date)}` : ''}</div>
                    </div>
                    <VPill tone={rev ? 'neutral' : p.status === 'paid' ? 'success' : p.status === 'overdue' ? 'danger' : 'warn'}>
                      {rev ? 'Reversed' : (p.status || 'due')[0].toUpperCase() + (p.status || 'due').slice(1)}
                    </VPill>
                  </div>
                  )
                })}
              </div>
            )}
          </VSection>
        </div>
      </div>
    </Layout>
  )
}
