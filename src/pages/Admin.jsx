import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { usePlan } from '../hooks/usePlan'
import { isDemoUser } from '../lib/demoData'
import Layout from '../components/Layout'

// Mock stats shown when viewing admin as the demo user
const DEMO_STATS = {
  users:      { total: 12, by_plan: { free: 7, pro: 3, portfolio: 2 } },
  mrr:        245,
  properties: { total: 19 },
  payments:   { total_collected: 87400, month_collected: 7100 },
  user_list:  [
    { id: '1', email: 'alice@example.com',   plan: 'portfolio', is_admin: false, properties: 5, subscribed: true,  joined: '2024-01-10T00:00:00Z' },
    { id: '2', email: 'bob@example.com',     plan: 'pro',       is_admin: false, properties: 3, subscribed: true,  joined: '2024-03-22T00:00:00Z' },
    { id: '3', email: 'carol@example.com',   plan: 'free',      is_admin: false, properties: 1, subscribed: false, joined: '2024-06-05T00:00:00Z' },
    { id: '4', email: 'david@example.com',   plan: 'pro',       is_admin: false, properties: 2, subscribed: true,  joined: '2024-07-18T00:00:00Z' },
    { id: '5', email: 'emma@example.com',    plan: 'free',      is_admin: false, properties: 1, subscribed: false, joined: '2024-09-01T00:00:00Z' },
    { id: '6', email: 'demo@vestry.app',     plan: 'portfolio', is_admin: true,  properties: 3, subscribed: false, joined: '2024-01-01T00:00:00Z' },
  ],
}

const fmt     = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n ?? 0)
const fmtDate = (s) => s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '—'

const PLAN_COLORS = {
  free:      { bg: '#f3f4f6', color: '#6b7280' },
  pro:       { bg: '#fef3c7', color: '#92400e' },
  portfolio: { bg: '#d1fae5', color: '#065f46' },
}

function KpiCard({ label, value, sub, accent }) {
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '20px 24px', flex: 1, minWidth: 160,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 700, color: accent || 'var(--text)', lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 5 }}>{sub}</div>}
    </div>
  )
}

function PlanBadge({ plan, isAdmin }) {
  const label  = isAdmin ? 'Admin' : (plan || 'free')
  const colors = PLAN_COLORS[isAdmin ? 'portfolio' : (plan || 'free')] ?? PLAN_COLORS.free
  return (
    <span style={{
      background: colors.bg, color: colors.color,
      padding: '2px 8px', borderRadius: 4, fontSize: 11,
      fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
    }}>
      {label}
    </span>
  )
}

export default function Admin() {
  const { user }        = useAuth()
  const { isAdmin, loading: planLoading } = usePlan()
  const navigate        = useNavigate()
  const [stats, setStats]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (planLoading) return
    if (!isAdmin) { navigate('/dashboard'); return }

    // Demo users get mock stats so the dashboard is always visible
    if (isDemoUser(user)) {
      setStats(DEMO_STATS)
      setLoading(false)
      return
    }

    fetch(`/.netlify/functions/admin-stats?userId=${user.id}`)
      .then(async r => {
        const data = await r.json()
        if (!r.ok || data.error || data.errorMessage) {
          throw new Error(data.error || data.errorMessage || `Server error ${r.status}`)
        }
        setStats(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [isAdmin, planLoading])

  const filtered = (stats?.user_list || []).filter(u =>
    !search || u.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Layout>
      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Admin</h1>
            <p className="page-subtitle">Platform overview · Vestry</p>
          </div>
          <div style={{
            background: '#1a1a2e', color: '#c4704a',
            padding: '6px 14px', borderRadius: 8,
            fontSize: 11, fontWeight: 800, letterSpacing: '0.1em',
          }}>
            ADMIN
          </div>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>{error}</div>}

        {loading ? (
          <div className="spinner" />
        ) : stats ? (
          <>
            {/* KPI row */}
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
              <KpiCard
                label="Total Landlords"
                value={stats.users.total}
                sub={`${stats.users.by_plan.pro + stats.users.by_plan.portfolio} paying`}
              />
              <KpiCard
                label="MRR"
                value={fmt(stats.mrr)}
                sub={`${stats.users.by_plan.pro} Pro · ${stats.users.by_plan.portfolio} Portfolio`}
                accent="var(--accent)"
              />
              <KpiCard
                label="Total Properties"
                value={stats.properties.total}
                sub="across all accounts"
              />
              <KpiCard
                label="Rent Collected"
                value={fmt(stats.payments.total_collected)}
                sub={`${fmt(stats.payments.month_collected)} this month`}
              />
            </div>

            {/* Subscription breakdown */}
            <div className="card" style={{ marginBottom: 20, padding: '20px 24px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 16 }}>
                Subscription Breakdown
              </div>
              <div style={{ display: 'flex', gap: 32 }}>
                {[
                  { key: 'free',      label: 'Free',      price: '$0/mo'  },
                  { key: 'pro',       label: 'Pro',       price: '$29/mo' },
                  { key: 'portfolio', label: 'Portfolio', price: '$79/mo' },
                ].map(tier => {
                  const count = stats.users.by_plan[tier.key] || 0
                  const pct   = stats.users.total ? Math.round((count / stats.users.total) * 100) : 0
                  return (
                    <div key={tier.key} style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{tier.label}</span>
                        <span style={{ fontSize: 13, color: 'var(--muted)' }}>{count} · {tier.price}</span>
                      </div>
                      <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 3,
                          background: tier.key === 'free' ? '#9ca3af' : tier.key === 'pro' ? '#f59e0b' : '#10b981',
                          width: `${pct}%`, transition: 'width 0.4s',
                        }} />
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{pct}% of users</div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* User table */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                  Landlord Accounts
                  <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>
                    {stats.users.total} total
                  </span>
                </div>
                <input
                  className="form-input"
                  placeholder="Search by email…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ width: 220, fontSize: 12.5, padding: '7px 12px' }}
                />
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Plan</th>
                    <th>Properties</th>
                    <th>Stripe Sub</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(u => (
                    <tr key={u.id}>
                      <td className="td-primary" style={{ fontFamily: 'monospace', fontSize: 12.5 }}>
                        {u.email}
                        {u.is_admin && (
                          <span style={{ marginLeft: 6, fontSize: 10, background: '#1a1a2e', color: '#c4704a', padding: '1px 5px', borderRadius: 3, fontWeight: 700 }}>
                            ADMIN
                          </span>
                        )}
                      </td>
                      <td><PlanBadge plan={u.plan} isAdmin={u.is_admin} /></td>
                      <td style={{ fontSize: 13, color: u.properties > 0 ? 'var(--text)' : 'var(--muted)' }}>
                        {u.properties}
                      </td>
                      <td>
                        {u.subscribed
                          ? <span style={{ color: '#10b981', fontSize: 12, fontWeight: 600 }}>● Active</span>
                          : <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--muted)' }}>{fmtDate(u.joined)}</td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24, fontSize: 13 }}>
                        No accounts found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </div>
    </Layout>
  )
}
