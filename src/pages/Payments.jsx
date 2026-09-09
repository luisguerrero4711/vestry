import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import Layout from '../components/Layout'
import { isDemoUser, demoPayments, demoExpenses } from '../lib/demoData'
import { VT, VIcon, VPill, VAvatar } from '../lib/vestry-shared'
import {
  collectedThisMonth, outstanding, expensesThisMonth, onTimeRate, monthlyCollected,
} from '../lib/derive'
import RecordPaymentModal from '../components/RecordPaymentModal'
import RequestPaymentModal from '../components/RequestPaymentModal'
import UpgradeGate from '../components/UpgradeGate'

const money = (n) => `$${Number(n || 0).toLocaleString()}`
const METHOD_LABELS = { bank_transfer: 'Bank transfer', check: 'Check', cash: 'Cash', venmo: 'Venmo', zelle: 'Zelle', other: 'Other', stripe: 'Stripe', autopay: 'Autopay' }
const STATUS = {
  paid:    { tone: 'success', label: 'Received' },
  due:     { tone: 'warn',    label: 'Due' },
  overdue: { tone: 'danger',  label: 'Overdue' },
  partial: { tone: 'warn',    label: 'Partial' },
}

function MonthlyBars({ data }) {
  const chartH = 90
  const maxV = Math.max(...data.map(m => m.amount), 1)
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: chartH, paddingBottom: 4, borderBottom: `1px solid ${VT.line}` }}>
        {data.map((m, i) => (
          <div key={i} style={{ position: 'relative', width: 28, height: chartH, display: 'flex', alignItems: 'flex-end' }}>
            <div style={{ width: '100%', height: (m.amount / maxV) * chartH, background: 'var(--brand)', borderRadius: 4 }} title={money(m.amount)} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 6 }}>
        {data.map((m, i) => <div key={i} style={{ width: 28, textAlign: 'center', fontSize: 11, color: VT.text3, fontWeight: 600 }}>{m.label}</div>)}
      </div>
    </div>
  )
}

export default function Payments() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const demo = isDemoUser(user)

  const [payments, setPayments] = useState([])
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showPayModal, setShowPayModal] = useState(false)
  const [requestRow, setRequestRow] = useState(null)
  const [filter, setFilter] = useState('all')
  const [toast, setToast] = useState('')

  async function load() {
    if (!user) { navigate('/auth'); return }
    if (demo) {
      setPayments(demoPayments)
      setExpenses(demoExpenses)
      setLoading(false)
      return
    }
    const [{ data: pays }, { data: exps }] = await Promise.all([
      supabase.from('rent_payments')
        .select('*, tenants(first_name, last_name), properties(name)')
        .eq('user_id', user.id).order('due_date', { ascending: false }).limit(100),
      supabase.from('expenses').select('amount, date').eq('user_id', user.id),
    ])
    setPayments(pays || [])
    setExpenses(exps || [])
    setLoading(false)
  }

  useEffect(() => { load() /* eslint-disable-next-line */ }, [user, navigate])

  // Return from a Stripe checkout link
  useEffect(() => {
    if (new URLSearchParams(location.search).get('paid') === 'true') {
      setToast('Payment received — thanks!')
      load()
      navigate('/payments', { replace: true })
      const t = setTimeout(() => setToast(''), 4000)
      return () => clearTimeout(t)
    }
    // eslint-disable-next-line
  }, [location.search])

  const collected = useMemo(() => collectedThisMonth(payments), [payments])
  const owed = useMemo(() => outstanding(payments), [payments])
  const spent = useMemo(() => expensesThisMonth(expenses), [expenses])
  const onTime = useMemo(() => onTimeRate(payments), [payments])
  const bars = useMemo(() => monthlyCollected(payments, 6), [payments])

  const rows = useMemo(() => {
    let list = payments
    if (filter === 'received') list = list.filter(p => p.status === 'paid')
    if (filter === 'outstanding') list = list.filter(p => p.status === 'due' || p.status === 'overdue' || p.status === 'partial')
    return list
  }, [payments, filter])

  const patch = (id, fields) => setPayments(prev => prev.map(p => p.id === id ? { ...p, ...fields } : p))

  return (
    <Layout>
      {showPayModal && (
        <RecordPaymentModal onClose={() => setShowPayModal(false)} onAdded={(row) => setPayments(prev => [row, ...prev])} />
      )}
      {requestRow && (
        <RequestPaymentModal
          payment={requestRow}
          onClose={() => setRequestRow(null)}
          onLinked={(id, url) => patch(id, { payment_link: url })}
        />
      )}
      <div className="v-page">
        {toast && (
          <div style={{ background: VT.greenTint, color: VT.green, borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 600, marginBottom: 14 }}>{toast}</div>
        )}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 13, color: VT.text3, fontWeight: 500, marginBottom: 4 }}>Rent collection · this month</div>
            <h1 style={{ fontFamily: VT.fontDisplay, fontSize: 30, fontWeight: 600, margin: 0, letterSpacing: '-0.03em', lineHeight: 1.1 }}>Payments</h1>
          </div>
          <button onClick={() => setShowPayModal(true)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px',
            background: VT.brand, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
            color: '#fff', cursor: 'pointer', boxShadow: '0 1px 2px rgba(37,99,235,0.3)',
          }}><VIcon.Plus s={14} c="#fff" /> Record payment</button>
        </div>

        {/* Hero */}
        <div className="v-hero-row v-mb-16" style={{ background: VT.card, borderRadius: 'var(--r-lg)', boxShadow: VT.shadowCard, overflow: 'hidden' }}>
          <div style={{ padding: 24, borderRight: `1px solid ${VT.line}`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, color: VT.text2, fontWeight: 500 }}>Collected this month</div>
              <div style={{ fontFamily: VT.fontDisplay, fontSize: 40, fontWeight: 600, letterSpacing: '-0.03em', marginTop: 4, lineHeight: 1 }}>{money(collected)}</div>
              {onTime != null && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 13, fontWeight: 600, color: onTime >= 90 ? VT.green : VT.amber }}>
                  {onTime}% on-time
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 22, marginTop: 24, paddingTop: 16, borderTop: `1px solid ${VT.line}` }}>
              {[['Outstanding', money(owed), VT.red], ['Expenses', money(spent), VT.amber], ['Net', money(collected - spent), VT.green]].map(([l, v, c]) => (
                <div key={l}>
                  <div style={{ fontSize: 11, color: VT.text3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{l}</div>
                  <div style={{ fontFamily: VT.fontDisplay, fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em', color: c, marginTop: 2 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ padding: 24 }}>
            <div style={{ fontSize: 13, color: VT.text2, fontWeight: 500, marginBottom: 18 }}>Collected — last 6 months</div>
            <MonthlyBars data={bars} />
          </div>
        </div>

        {/* Table */}
        <div style={{ background: VT.card, borderRadius: 'var(--r-md)', boxShadow: VT.shadowCard, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 20px', borderBottom: `1px solid ${VT.line}`, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 4, padding: 4, background: VT.tint, borderRadius: 10 }}>
              {[['all', 'All'], ['received', 'Received'], ['outstanding', 'Outstanding']].map(([k, label]) => (
                <button key={k} onClick={() => setFilter(k)} style={{
                  padding: '5px 12px', border: 'none', cursor: 'pointer',
                  background: filter === k ? VT.card : 'transparent',
                  color: filter === k ? VT.text1 : VT.text2,
                  fontSize: 12, fontWeight: 600, borderRadius: 7,
                  boxShadow: filter === k ? VT.shadowCard : 'none',
                }}>{label}</button>
              ))}
            </div>
            <div style={{ marginLeft: 'auto', fontSize: 12, color: VT.text3, fontWeight: 500 }}>{rows.length} transactions</div>
          </div>

          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: VT.text3, fontWeight: 500 }}>Loading payments…</div>
          ) : rows.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: VT.text3, fontWeight: 500 }}>No payments to show.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                <thead>
                  <tr style={{ background: VT.tint }}>
                    {['Date', 'Tenant', 'Property', 'Amount', 'Method', 'Status', ''].map((h, i) => (
                      <th key={i} style={{ textAlign: i === 3 ? 'right' : 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: VT.text3, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => {
                    const name = p.tenants ? `${p.tenants.first_name || ''} ${p.tenants.last_name || ''}`.trim() : '—'
                    const st = STATUS[p.status] || { tone: 'neutral', label: p.status || '—' }
                    const dt = p.paid_date || p.due_date
                    const canRequest = (p.status === 'due' || p.status === 'overdue') && p.tenant_id
                    return (
                      <tr key={p.id} style={{ borderTop: `1px solid ${VT.line}` }}>
                        <td style={{ padding: '14px 16px', fontSize: 13, color: VT.text2, fontWeight: 500, whiteSpace: 'nowrap' }}>
                          {dt ? new Date(dt + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <VAvatar initials={name !== '—' ? name.slice(0, 2).toUpperCase() : '?'} size={26} />
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: 13, color: VT.text2, fontWeight: 500, whiteSpace: 'nowrap' }}>{p.properties?.name || '—'}</td>
                        <td style={{ padding: '14px 16px', fontFamily: VT.fontDisplay, fontSize: 14, fontWeight: 600, textAlign: 'right', whiteSpace: 'nowrap', color: p.status === 'overdue' ? VT.red : VT.text1 }}>{money(p.amount)}</td>
                        <td style={{ padding: '14px 16px', fontSize: 13, color: VT.text2, fontWeight: 500 }}>{METHOD_LABELS[p.payment_method] || p.payment_method || '—'}</td>
                        <td style={{ padding: '14px 16px' }}><VPill tone={st.tone}>{st.label}</VPill></td>
                        <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                          {canRequest && (
                            <UpgradeGate feature="stripePayments" compact>
                              <button onClick={() => setRequestRow({
                                id: p.id, tenant_id: p.tenant_id, amount: p.amount,
                                tenantName: name, propertyName: p.properties?.name, notes: p.notes, payment_link: p.payment_link,
                              })} style={{ padding: '5px 10px', background: VT.brandTint, color: VT.brand, border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                {p.payment_link ? 'Link ready' : 'Request'}
                              </button>
                            </UpgradeGate>
                          )}
                        </td>
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
