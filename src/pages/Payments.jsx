import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import Layout from '../components/Layout'
import { isDemoUser } from '../lib/demoData'
import { VT, VIcon, VPill, VAvatar } from '../lib/vestry-shared'
import RecordPaymentModal from '../components/RecordPaymentModal'

// Monthly bar chart
function MonthlyBars({ months }) {
  const chartH = 90
  const maxV = Math.max(...months.map(m => m.expected), 1)
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: chartH, paddingBottom: 4, borderBottom: `1px solid ${VT.line}` }}>
        {months.map((m) => {
          const recH = (m.received / maxV) * chartH
          const expH = (m.expected / maxV) * chartH
          return (
            <div key={m.m} style={{ display: 'flex', alignItems: 'flex-end', gap: 0 }}>
              <div style={{ position: 'relative', width: 28, height: chartH, display: 'flex', alignItems: 'flex-end' }}>
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: expH, background: VT.tint, borderRadius: 4 }} />
                <div style={{
                  position: 'relative', width: '100%', height: recH,
                  background: recH < expH ? 'linear-gradient(180deg, var(--brand), var(--brand-pressed))' : 'var(--brand)',
                  borderRadius: 4,
                }} />
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 6 }}>
        {months.map(m => (
          <div key={m.m} style={{ width: 28, textAlign: 'center', fontSize: 11, color: VT.text3, fontWeight: 600 }}>{m.m}</div>
        ))}
      </div>
    </div>
  )
}

function statusTone(status) {
  if (!status) return 'neutral'
  const s = status.toLowerCase()
  if (s === 'paid' || s === 'received') return 'success'
  if (s === 'pending') return 'warn'
  if (s === 'overdue' || s === 'late') return 'danger'
  return 'neutral'
}

export default function Payments() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showPayModal, setShowPayModal] = useState(false)

  useEffect(() => {
    if (!user) { navigate('/auth'); return }
    async function load() {
      if (isDemoUser(user)) {
        setPayments(demoRows)
      } else {
        // Table is rent_payments, join tenants + properties for display names
        const { data } = await supabase
          .from('rent_payments')
          .select('*, tenants(first_name, last_name), properties(name)')
          .eq('user_id', user.id)
          .order('due_date', { ascending: false })
          .limit(50)
        setPayments(data || [])
      }
      setLoading(false)
    }
    load()
  }, [user, navigate])

  const months = [
    { m: 'Jan', received: 4250, expected: 4450 },
    { m: 'Feb', received: 4450, expected: 4450 },
    { m: 'Mar', received: 4450, expected: 4450 },
    { m: 'Apr', received: 4450, expected: 4450 },
    { m: 'May', received: 2650, expected: 4450 },
  ]

  const demoRows = [
    { d: 'May 3',  init: 'MW', color: '#4ECDC4', name: 'Marcus Williams', prop: 'Oak Street · Unit B', amt: '+$1,200', method: 'Check',         ref: '#0418',    status: 'success', label: 'Received' },
    { d: 'May 1',  init: 'SC', color: '#FF6B6B', name: 'Sarah Chen',      prop: 'Oak Street · Unit A', amt: '+$1,450', method: 'Bank transfer',  ref: 'ACH-7821', status: 'success', label: 'Received' },
    { d: 'May 1',  init: 'PP', color: '#FFD93D', name: 'Priya Patel',     prop: 'Riverside Condo',     amt: '$1,800',  method: '—',              ref: '—',        status: 'danger',  label: 'Overdue'  },
    { d: 'Apr 14', init: '—',  color: '#FB923C', name: 'Acme Plumbing',   prop: 'Oak Street · Unit A', amt: '−$185',   method: 'Card',           ref: 'EXP-0214', status: 'neutral', label: 'Expense'  },
    { d: 'Apr 4',  init: 'MW', color: '#4ECDC4', name: 'Marcus Williams', prop: 'Oak Street · Unit B', amt: '+$1,200', method: 'Check',          ref: '#0411',    status: 'warn',    label: 'Late · 4d'},
    { d: 'Apr 1',  init: 'SC', color: '#FF6B6B', name: 'Sarah Chen',      prop: 'Oak Street · Unit A', amt: '+$1,450', method: 'Bank transfer',  ref: 'ACH-7641', status: 'success', label: 'Received' },
    { d: 'Apr 1',  init: 'PP', color: '#FFD93D', name: 'Priya Patel',     prop: 'Riverside Condo',     amt: '+$1,800', method: 'Bank transfer',  ref: 'ACH-7639', status: 'success', label: 'Received' },
  ]

  const METHOD_LABELS = {
    bank_transfer: 'Bank transfer', check: 'Check', cash: 'Cash',
    venmo: 'Venmo', zelle: 'Zelle', other: 'Other',
  }
  const STATUS_LABELS = { paid: 'Received', due: 'Due', overdue: 'Overdue', partial: 'Partial' }

  const rows = isDemoUser(user) ? demoRows : payments.map(p => {
    const tenantName = p.tenants
      ? `${p.tenants.first_name || ''} ${p.tenants.last_name || ''}`.trim()
      : '—'
    const displayDate = p.paid_date || p.due_date
    return {
      d: displayDate ? new Date(displayDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—',
      init: tenantName !== '—' ? tenantName.slice(0, 2).toUpperCase() : '?',
      color: '#60A5FA',
      name: tenantName,
      prop: p.properties?.name || '—',
      amt: p.amount ? `+$${Number(p.amount).toLocaleString()}` : '—',
      method: METHOD_LABELS[p.payment_method] || p.payment_method || '—',
      ref: p.notes || '—',
      status: statusTone(p.status),
      label: STATUS_LABELS[p.status] || p.status || '—',
    }
  })

  const handlePaymentAdded = (newRow) => {
    setPayments(prev => [newRow, ...prev])
  }

  return (
    <Layout>
      {showPayModal && (
        <RecordPaymentModal
          onClose={() => setShowPayModal(false)}
          onAdded={handlePaymentAdded}
        />
      )}
      <div className="v-page">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 13, color: VT.text3, fontWeight: 500, marginBottom: 4 }}>Year to date · Jan 1 – May 3, 2026</div>
            <h1 style={{ fontFamily: VT.fontDisplay, fontSize: 30, fontWeight: 600, margin: 0, letterSpacing: '-0.03em', lineHeight: 1.1 }}>Payments</h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 12px', background: VT.card, border: `1px solid ${VT.line}`,
              borderRadius: 8, fontSize: 13, fontWeight: 500, color: VT.text2, cursor: 'pointer',
            }}><VIcon.Download s={14} /> Export</button>
            <button
              onClick={() => setShowPayModal(true)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', background: VT.brand, border: 'none',
                borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(37,99,235,0.3)',
              }}><VIcon.Plus s={14} c="#fff" /> Record payment</button>
          </div>
        </div>

        {/* Hero card */}
        <div className="v-hero-row v-mb-16" style={{
          background: VT.card, borderRadius: 'var(--r-lg)', boxShadow: VT.shadowCard,
          overflow: 'hidden',
        }}>
          <div style={{ padding: 24, borderRight: `1px solid ${VT.line}`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, color: VT.text2, fontWeight: 500 }}>Total received YTD</div>
              <div style={{ fontFamily: VT.fontDisplay, fontSize: 40, fontWeight: 600, letterSpacing: '-0.03em', marginTop: 4, lineHeight: 1 }}>$20,250</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 13, fontWeight: 600, color: VT.green }}>
                <VIcon.Up s={12} c="var(--green)" /> +$2,650 this month
              </div>
            </div>
            <div style={{ display: 'flex', gap: 22, marginTop: 24, paddingTop: 16, borderTop: `1px solid ${VT.line}` }}>
              {[['Outstanding', '$1,800', VT.red], ['Expenses', '$725', VT.amber], ['Net', '$19,525', VT.green]].map(([l, v, c]) => (
                <div key={l}>
                  <div style={{ fontSize: 11, color: VT.text3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{l}</div>
                  <div style={{ fontFamily: VT.fontDisplay, fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em', color: c, marginTop: 2 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 }}>
              <div style={{ fontSize: 13, color: VT.text2, fontWeight: 500 }}>Monthly collection</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 11, color: VT.text2, fontWeight: 500 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: VT.brand }} /> Received
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: VT.tint }} /> Expected
                </span>
              </div>
            </div>
            <MonthlyBars months={months} />
          </div>
        </div>

        {/* Table card */}
        <div style={{ background: VT.card, borderRadius: 'var(--r-md)', boxShadow: VT.shadowCard, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 20px', borderBottom: `1px solid ${VT.line}`, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 4, padding: 4, background: VT.tint, borderRadius: 10 }}>
              {['All', 'Received', 'Outstanding', 'Expenses'].map((p, i) => (
                <button key={p} style={{
                  padding: '5px 12px', border: 'none', cursor: 'pointer',
                  background: i === 0 ? VT.card : 'transparent',
                  color: i === 0 ? VT.text1 : VT.text2,
                  fontSize: 12, fontWeight: 600, borderRadius: 7,
                  boxShadow: i === 0 ? VT.shadowCard : 'none',
                }}>{p}</button>
              ))}
            </div>
            <button style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 10px', background: 'transparent', border: `1px solid ${VT.line}`,
              borderRadius: 8, fontSize: 12, fontWeight: 500, color: VT.text2, cursor: 'pointer',
            }}><VIcon.Calendar s={13} /> May 2026</button>
            <div style={{ marginLeft: 'auto', fontSize: 12, color: VT.text3, fontWeight: 500 }}>{rows.length} transactions</div>
          </div>

          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: VT.text3, fontWeight: 500 }}>Loading payments…</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>
                <thead>
                  <tr style={{ background: VT.tint }}>
                    {['Date', 'Counterparty', 'Property', 'Amount', 'Method', 'Reference', 'Status', ''].map((h, i) => (
                      <th key={i} style={{
                        textAlign: i === 3 ? 'right' : 'left', padding: '10px 16px',
                        fontSize: 11, fontWeight: 600, color: VT.text3,
                        textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const amtColor = r.label === 'Overdue' ? VT.red : r.label === 'Expense' ? VT.text2 : VT.text1
                    return (
                      <tr key={i} style={{ borderTop: `1px solid ${VT.line}` }}>
                        <td style={{ padding: '14px 16px', fontSize: 13, color: VT.text2, fontWeight: 500, whiteSpace: 'nowrap' }}>{r.d}</td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <VAvatar initials={r.init} size={26} color={r.color} />
                            <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em' }}>{r.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: 13, color: VT.text2, fontWeight: 500, whiteSpace: 'nowrap' }}>{r.prop}</td>
                        <td style={{ padding: '14px 16px', fontFamily: VT.fontDisplay, fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em', color: amtColor, textAlign: 'right', whiteSpace: 'nowrap' }}>{r.amt}</td>
                        <td style={{ padding: '14px 16px', fontSize: 13, color: VT.text2, fontWeight: 500 }}>{r.method}</td>
                        <td style={{ padding: '14px 16px', fontFamily: VT.fontMono, fontSize: 12, color: VT.text3, fontWeight: 500 }}>{r.ref}</td>
                        <td style={{ padding: '14px 16px' }}><VPill tone={r.status}>{r.label}</VPill></td>
                        <td style={{ padding: '14px 12px', textAlign: 'right' }}><VIcon.Chevron s={14} c="var(--text-3)" /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
