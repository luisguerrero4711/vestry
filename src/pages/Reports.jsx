import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import Layout from '../components/Layout'

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n ?? 0)

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function Reports() {
  const { user } = useAuth()
  const [properties, setProps] = useState([])
  const [payments, setPays]    = useState([])
  const [expenses, setExp]     = useState([])
  const [loading, setLoading]  = useState(true)
  const [year, setYear]        = useState(new Date().getFullYear())
  const [propFilter, setProp]  = useState('all')

  useEffect(() => {
    if (user) fetchData()
  }, [user, year])

  const fetchData = async () => {
    setLoading(true)
    const [{ data: ps }, { data: pays }, { data: exps }] = await Promise.all([
      supabase.from('properties').select('id,name,city,state').eq('user_id', user.id),
      supabase.from('rent_payments')
        .select('*').eq('user_id', user.id)
        .gte('paid_date', `${year}-01-01`)
        .lte('paid_date', `${year}-12-31`)
        .eq('status', 'paid'),
      supabase.from('expenses')
        .select('*').eq('user_id', user.id)
        .gte('date', `${year}-01-01`)
        .lte('date', `${year}-12-31`),
    ])
    setProps(ps ?? [])
    setPays(pays ?? [])
    setExp(exps ?? [])
    setLoading(false)
  }

  const filtPays = propFilter === 'all' ? payments : payments.filter(p => p.property_id === propFilter)
  const filtExps = propFilter === 'all' ? expenses : expenses.filter(e => e.property_id === propFilter)

  // Annual totals
  const totalCollected = filtPays.reduce((s, p) => s + Number(p.amount), 0)
  const totalExpenses  = filtExps.reduce((s, e) => s + Number(e.amount), 0)
  const netIncome      = totalCollected - totalExpenses

  // Monthly breakdown
  const monthly = MONTHS.map((label, idx) => {
    const m = String(idx + 1).padStart(2, '0')
    const collected = filtPays
      .filter(p => p.paid_date?.startsWith(`${year}-${m}`))
      .reduce((s, p) => s + Number(p.amount), 0)
    const expTotal = filtExps
      .filter(e => e.date?.startsWith(`${year}-${m}`))
      .reduce((s, e) => s + Number(e.amount), 0)
    return { label, collected, expenses: expTotal, net: collected - expTotal }
  })

  // Per-property breakdown
  const perProperty = properties.map(prop => {
    const collected = payments.filter(p => p.property_id === prop.id).reduce((s, p) => s + Number(p.amount), 0)
    const expTotal  = expenses.filter(e => e.property_id === prop.id).reduce((s, e) => s + Number(e.amount), 0)
    return { ...prop, collected, expenses: expTotal, net: collected - expTotal }
  })

  const maxBar = Math.max(...monthly.map(m => Math.max(m.collected, m.expenses)), 1)

  return (
    <Layout>
      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Financial Reports</h1>
            <p className="page-subtitle">Annual summary — income, expenses, and net income</p>
          </div>
          {/* Year selector */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn btn-outline btn-sm" onClick={() => setYear(y => y - 1)}>◀</button>
            <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 600, color: 'var(--head)', minWidth: 60, textAlign: 'center' }}>{year}</span>
            <button className="btn btn-outline btn-sm" onClick={() => setYear(y => y + 1)}>▶</button>
          </div>
        </div>

        {/* Property filter */}
        <div style={styles.filterRow}>
          <button style={{ ...styles.filterBtn, ...(propFilter === 'all' ? styles.filterActive : {}) }}
            onClick={() => setProp('all')}>All Properties</button>
          {properties.map(p => (
            <button key={p.id}
              style={{ ...styles.filterBtn, ...(propFilter === p.id ? styles.filterActive : {}) }}
              onClick={() => setProp(p.id)}>{p.name}</button>
          ))}
        </div>

        {loading ? <div className="spinner" /> : (
          <>
            {/* KPI Summary */}
            <div style={styles.kpiRow}>
              {[
                { label: 'Total Collected', value: fmt(totalCollected), color: 'var(--stat-col)' },
                { label: 'Total Expenses',  value: fmt(totalExpenses),  color: 'var(--text)' },
                { label: 'Net Income',      value: fmt(netIncome),      color: netIncome >= 0 ? '#059669' : 'var(--late)' },
                { label: 'Expense Ratio',   value: totalCollected > 0 ? `${Math.round((totalExpenses / totalCollected) * 100)}%` : '—', color: 'var(--text)' },
              ].map(k => (
                <div key={k.label} style={styles.kpi}>
                  <div style={{ ...styles.kpiVal, color: k.color }}>{k.value}</div>
                  <div style={styles.kpiLabel}>{k.label}</div>
                </div>
              ))}
            </div>

            {/* Monthly bar chart (CSS-based) */}
            <div className="card" style={{ marginBottom: 24 }}>
              <div style={styles.cardHead}>
                <div style={styles.cardTitle}>Monthly Breakdown — {year}</div>
              </div>
              <div style={{ padding: '20px 24px' }}>
                <div style={styles.barChart}>
                  {monthly.map(m => (
                    <div key={m.label} style={styles.barGroup}>
                      <div style={styles.barPair}>
                        <div style={{
                          ...styles.bar,
                          height: `${(m.collected / maxBar) * 100}%`,
                          background: 'var(--accent)',
                          opacity: 0.85,
                        }} title={`Collected: ${fmt(m.collected)}`} />
                        <div style={{
                          ...styles.bar,
                          height: `${(m.expenses / maxBar) * 100}%`,
                          background: 'var(--border)',
                        }} title={`Expenses: ${fmt(m.expenses)}`} />
                      </div>
                      <div style={styles.barLabel}>{m.label}</div>
                    </div>
                  ))}
                </div>
                <div style={styles.legend}>
                  <span style={{ ...styles.legendDot, background: 'var(--accent)' }} /> Collected
                  <span style={{ ...styles.legendDot, background: 'var(--border)', marginLeft: 16 }} /> Expenses
                </div>
              </div>
            </div>

            {/* Monthly table */}
            <div className="card" style={{ marginBottom: 24 }}>
              <div style={styles.cardHead}>
                <div style={styles.cardTitle}>Monthly Detail</div>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Collected</th>
                    <th>Expenses</th>
                    <th>Net Income</th>
                  </tr>
                </thead>
                <tbody>
                  {monthly.map(m => (
                    <tr key={m.label}>
                      <td style={{ fontWeight: 500 }}>{m.label} {year}</td>
                      <td className="td-mono" style={{ color: 'var(--stat-col)' }}>{m.collected > 0 ? fmt(m.collected) : '—'}</td>
                      <td className="td-mono" style={{ color: 'var(--muted)' }}>{m.expenses > 0 ? fmt(m.expenses) : '—'}</td>
                      <td className="td-mono" style={{ color: m.net >= 0 ? '#059669' : 'var(--late)', fontWeight: 600 }}>
                        {m.collected > 0 || m.expenses > 0 ? fmt(m.net) : '—'}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ background: 'var(--cream)', fontWeight: 700 }}>
                    <td style={{ fontWeight: 700 }}>Total {year}</td>
                    <td className="td-mono" style={{ color: 'var(--stat-col)', fontWeight: 700 }}>{fmt(totalCollected)}</td>
                    <td className="td-mono" style={{ fontWeight: 700 }}>{fmt(totalExpenses)}</td>
                    <td className="td-mono" style={{ color: netIncome >= 0 ? '#059669' : 'var(--late)', fontWeight: 700 }}>{fmt(netIncome)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Per-property breakdown */}
            {properties.length > 1 && propFilter === 'all' && (
              <div className="card">
                <div style={styles.cardHead}>
                  <div style={styles.cardTitle}>Per-Property Summary</div>
                </div>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Property</th>
                      <th>Location</th>
                      <th>Collected</th>
                      <th>Expenses</th>
                      <th>Net Income</th>
                    </tr>
                  </thead>
                  <tbody>
                    {perProperty.map(p => (
                      <tr key={p.id}>
                        <td className="td-primary">{p.name}</td>
                        <td style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                          {[p.city, p.state].filter(Boolean).join(', ')}
                        </td>
                        <td className="td-mono" style={{ color: 'var(--stat-col)' }}>{fmt(p.collected)}</td>
                        <td className="td-mono">{fmt(p.expenses)}</td>
                        <td className="td-mono" style={{ color: p.net >= 0 ? '#059669' : 'var(--late)', fontWeight: 600 }}>{fmt(p.net)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}

const styles = {
  filterRow: {
    display: 'flex', gap: 6, marginBottom: 22, flexWrap: 'wrap',
  },
  filterBtn: {
    padding: '7px 14px', border: '1px solid var(--border)', borderRadius: 100,
    background: 'transparent', color: 'var(--muted)', fontSize: 12.5, fontWeight: 500,
    cursor: 'pointer', fontFamily: "'Outfit', sans-serif", transition: 'all 0.15s',
  },
  filterActive: {
    background: 'var(--active-bg)', color: 'var(--active-fg)',
    borderColor: 'var(--pill-bd)', fontWeight: 600,
  },
  kpiRow: {
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24,
  },
  kpi: {
    background: 'var(--warm-white)', border: '1px solid var(--border)',
    borderRadius: 12, padding: '16px 20px',
  },
  kpiVal: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 28, fontWeight: 600, lineHeight: 1, marginBottom: 4,
  },
  kpiLabel: {
    fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.08em', color: 'var(--muted)',
  },
  cardHead: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '18px 24px 14px', borderBottom: '1px solid var(--border)',
  },
  cardTitle: {
    fontFamily: "'Cormorant Garamond', serif", fontSize: 17, fontWeight: 600, color: 'var(--head)',
  },
  barChart: {
    display: 'flex', alignItems: 'flex-end', gap: 8, height: 140, marginBottom: 8,
  },
  barGroup: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
  },
  barPair: {
    width: '100%', flex: 1, display: 'flex', alignItems: 'flex-end', gap: 2,
  },
  bar: {
    flex: 1, borderRadius: '3px 3px 0 0', minHeight: 2, transition: 'height 0.3s',
  },
  barLabel: {
    fontSize: 9.5, color: 'var(--muted)', fontWeight: 600, letterSpacing: '0.04em',
  },
  legend: {
    display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted)',
    fontWeight: 500, marginTop: 8,
  },
  legendDot: {
    width: 10, height: 10, borderRadius: 2, display: 'inline-block',
  },
}
