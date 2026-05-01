import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import Layout from '../components/Layout'
import KpiCard from '../components/KpiCard'
import StatusPill from '../components/StatusPill'
import { isDemoUser, demoProperties, demoPayments, demoExpenses, demoTenants } from '../lib/demoData'

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n ?? 0)

const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December']

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading]     = useState(true)
  const [properties, setProps]    = useState([])
  const [payments, setPayments]   = useState([])
  const [expenses, setExpenses]   = useState([])
  const [tenants, setTenants]     = useState([])

  const now        = new Date()
  const monthLabel = `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

  useEffect(() => {
    if (!user) return
    fetchAll()
  }, [user])

  const fetchAll = async () => {
    setLoading(true)
    if (isDemoUser(user)) {
      const currentPays = demoPayments.filter(p =>
        p.due_date >= monthStart && p.due_date <= monthEnd)
      const currentExps = demoExpenses.filter(e =>
        e.date >= monthStart && e.date <= monthEnd)
      setProps(demoProperties)
      setPayments(currentPays)
      setExpenses(currentExps)
      setTenants(demoTenants.filter(t => t.status === 'active'))
      setLoading(false)
      return
    }
    const [{ data: props }, { data: pays }, { data: exps }, { data: tens }] = await Promise.all([
      supabase.from('properties').select('*').eq('user_id', user.id).order('created_at'),
      supabase.from('rent_payments')
        .select('*, properties(name,city,state), tenants(first_name,last_name)')
        .eq('user_id', user.id)
        .gte('due_date', monthStart)
        .lte('due_date', monthEnd)
        .order('due_date'),
      supabase.from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', monthStart)
        .lte('date', monthEnd),
      supabase.from('tenants').select('*').eq('user_id', user.id).eq('status', 'active'),
    ])
    setProps(props ?? [])
    setPayments(pays ?? [])
    setExpenses(exps ?? [])
    setTenants(tens ?? [])
    setLoading(false)
  }

  // ── KPI calculations
  const collected    = payments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0)
  const totalDue     = payments.reduce((s, p) => s + Number(p.amount), 0)
  const totalExp     = expenses.reduce((s, e) => s + Number(e.amount), 0)
  const netIncome    = collected - totalExp
  const collPct      = totalDue > 0 ? Math.round((collected / totalDue) * 100) : 0

  // ── Payment status per payment row
  const enriched = payments.map(p => {
    let status = p.status
    if (status === 'due' && new Date(p.due_date) < now) status = 'overdue'
    return { ...p, displayStatus: status }
  })

  if (loading) return (
    <Layout>
      <div className="spinner" />
    </Layout>
  )

  const hasData = properties.length > 0 || payments.length > 0

  return (
    <Layout>
      <div className="page">
        {/* ── Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Portfolio Overview</h1>
            <p className="page-subtitle">
              {monthLabel} · {properties.length} {properties.length === 1 ? 'property' : 'properties'} · {tenants.length} active {tenants.length === 1 ? 'tenant' : 'tenants'}
            </p>
          </div>
          <button
            className="btn btn-accent btn-sm"
            onClick={() => navigate('/properties')}
          >
            + Add Property
          </button>
        </div>

        {/* ── KPI Row */}
        <div style={styles.kpiRow}>
          <KpiCard label="Collected"  value={fmt(collected)} color="accent" icon="💰" />
          <KpiCard label="Expenses"   value={fmt(totalExp)}  color="dark"   icon="🔧" />
          <KpiCard label="Net Income" value={fmt(netIncome)} color={netIncome >= 0 ? 'green' : 'accent'} icon="📈" />
          <KpiCard label="Collection Rate" value={`${collPct}%`} color="dark" icon="📊" />
        </div>

        {/* ── Rent Status Table */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={styles.cardHead}>
            <div style={styles.cardTitle}>Rent Status — {monthLabel}</div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/payments')}>
              View all →
            </button>
          </div>

          {enriched.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">💳</div>
              <div className="empty-title">No payments this month</div>
              <div className="empty-sub">Log rent payments in the Payments section.</div>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/payments')}>
                Log a payment
              </button>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Tenant</th>
                  <th>Due Date</th>
                  <th>Rent</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {enriched.map(p => (
                  <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => navigate('/payments')}>
                    <td>
                      <div className="td-primary">
                        {p.properties?.name ?? '—'}
                      </div>
                      <div className="td-secondary">
                        {p.properties?.city}{p.properties?.state ? `, ${p.properties.state}` : ''}
                      </div>
                    </td>
                    <td style={{ color: 'var(--muted)', fontSize: 13 }}>
                      {p.tenants
                        ? `${p.tenants.first_name[0]}. ${p.tenants.last_name}`
                        : '—'}
                    </td>
                    <td style={{ color: 'var(--muted)', fontSize: 13 }}>
                      {new Date(p.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="td-mono">{fmt(p.amount)}</td>
                    <td><StatusPill status={p.displayStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Properties list + expenses summary side by side */}
        <div style={styles.bottomGrid}>
          {/* Properties */}
          <div className="card">
            <div style={styles.cardHead}>
              <div style={styles.cardTitle}>Your Properties</div>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/properties')}>
                Manage →
              </button>
            </div>
            {properties.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🏠</div>
                <div className="empty-title">No properties yet</div>
                <div className="empty-sub">Add your first property to get started.</div>
                <button className="btn btn-primary btn-sm" onClick={() => navigate('/properties')}>
                  Add property
                </button>
              </div>
            ) : (
              <div style={{ padding: '8px 8px 12px' }}>
                {properties.map(prop => (
                  <div
                    key={prop.id}
                    style={styles.propItem}
                    onClick={() => navigate('/properties')}
                  >
                    <div style={styles.propAvatar}>🏠</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={styles.propName}>{prop.name}</div>
                      <div style={styles.propCity}>
                        {prop.city}{prop.state ? `, ${prop.state}` : ''}
                      </div>
                    </div>
                    <div style={styles.propUnits}>
                      {prop.units_count} {prop.units_count === 1 ? 'unit' : 'units'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Expenses summary */}
          <div className="card">
            <div style={styles.cardHead}>
              <div style={styles.cardTitle}>Expenses — {monthLabel}</div>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/expenses')}>
                View all →
              </button>
            </div>
            {expenses.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🔧</div>
                <div className="empty-title">No expenses logged</div>
                <div className="empty-sub">Track repairs, insurance, and more.</div>
                <button className="btn btn-primary btn-sm" onClick={() => navigate('/expenses')}>
                  Log expense
                </button>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.slice(0, 6).map(exp => (
                    <tr key={exp.id}>
                      <td>
                        <div className="td-primary">{exp.description}</div>
                        <div className="td-secondary">{exp.vendor}</div>
                      </td>
                      <td>
                        <span className="pill pill-accent" style={{ fontSize: 10.5 }}>
                          {exp.category}
                        </span>
                      </td>
                      <td className="td-mono">{fmt(exp.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ── Welcome state when truly empty */}
        {!hasData && (
          <div style={styles.welcomeCard}>
            <div style={styles.welcomeEmoji}>🏡</div>
            <h2 style={styles.welcomeTitle}>Welcome to Vestry</h2>
            <p style={styles.welcomeSub}>
              Get started by adding your first property, then log tenants, leases, and rent payments.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => navigate('/properties')}>
                🏠 Add a property
              </button>
              <button className="btn btn-outline" onClick={() => navigate('/tenants')}>
                👤 Add a tenant
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

const styles = {
  kpiRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 14,
    marginBottom: 24,
  },
  cardHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '18px 20px 14px',
    borderBottom: '1px solid var(--border)',
  },
  cardTitle: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 17,
    fontWeight: 600,
    color: 'var(--head)',
  },
  bottomGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 20,
  },
  propItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 10px',
    borderRadius: 10,
    cursor: 'pointer',
    transition: 'background 0.15s',
    marginBottom: 2,
  },
  propAvatar: {
    width: 38,
    height: 38,
    borderRadius: 10,
    background: 'var(--light-fill)',
    border: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    flexShrink: 0,
  },
  propName: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  propCity: {
    fontSize: 11.5,
    color: 'var(--muted)',
    marginTop: 1,
  },
  propUnits: {
    fontSize: 11.5,
    color: 'var(--muted)',
    fontWeight: 500,
    flexShrink: 0,
  },
  welcomeCard: {
    background: 'var(--warm-white)',
    border: '1px solid var(--border)',
    borderRadius: 16,
    padding: '48px 40px',
    textAlign: 'center',
    marginTop: 24,
  },
  welcomeEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  welcomeTitle: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 28,
    fontWeight: 600,
    color: 'var(--head)',
    marginBottom: 10,
  },
  welcomeSub: {
    fontSize: 14.5,
    color: 'var(--muted)',
    lineHeight: 1.7,
    maxWidth: 380,
    margin: '0 auto 28px',
  },
}
