import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { usePlan } from '../hooks/usePlan'
import { isDemoUser } from '../lib/demoData'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'

// ── Demo data shown when signed in as demo@vestry.app ───────────────────────
const DEMO_USERS = [
  { id: '1', email: 'alice@example.com',   full_name: 'Alice Park',    avatar_url: null, plan: 'portfolio', is_admin: false, role: 'landlord', is_active: true,  property_count: 5, created_at: '2024-01-10T00:00:00Z' },
  { id: '2', email: 'bob@example.com',     full_name: 'Bob Chen',      avatar_url: null, plan: 'pro',       is_admin: false, role: 'landlord', is_active: true,  property_count: 3, created_at: '2024-03-22T00:00:00Z' },
  { id: '3', email: 'carol@example.com',   full_name: 'Carol Martinez', avatar_url: null, plan: 'free',     is_admin: false, role: 'tenant',   is_active: true,  property_count: 0, created_at: '2024-06-05T00:00:00Z' },
  { id: '4', email: 'david@example.com',   full_name: 'David Kim',     avatar_url: null, plan: 'pro',       is_admin: false, role: 'landlord', is_active: false, property_count: 2, created_at: '2024-07-18T00:00:00Z' },
  { id: '5', email: 'emma@example.com',    full_name: 'Emma Wilson',   avatar_url: null, plan: 'free',      is_admin: false, role: 'tenant',   is_active: true,  property_count: 0, created_at: '2024-09-01T00:00:00Z' },
  { id: '6', email: 'demo@vestry.app',     full_name: 'Demo Admin',    avatar_url: null, plan: 'portfolio', is_admin: true,  role: 'admin',    is_active: true,  property_count: 3, created_at: '2024-01-01T00:00:00Z' },
]

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt     = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n ?? 0)
const fmtDate = (s) => s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '—'

const PLAN_COLORS = {
  free:      { bg: '#f3f4f6', color: '#6b7280' },
  pro:       { bg: '#fef3c7', color: '#92400e' },
  portfolio: { bg: '#d1fae5', color: '#065f46' },
}
const PLAN_PRICE = { free: 0, pro: 29, portfolio: 79 }

function computeStats(users) {
  const active = users.filter(u => !u.is_admin)
  const byPlan = { free: 0, pro: 0, portfolio: 0 }
  active.forEach(u => { if (byPlan[u.plan] !== undefined) byPlan[u.plan]++ })
  const mrr = Object.entries(byPlan).reduce((sum, [plan, count]) => sum + (PLAN_PRICE[plan] || 0) * count, 0)
  const properties = active.reduce((sum, u) => sum + (Number(u.property_count) || 0), 0)
  return { total: active.length, byPlan, mrr, properties }
}

// ── Sub-components ────────────────────────────────────────────────────────────
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

function Avatar({ url, name, size = 28 }) {
  if (url) {
    return <img src={url} alt={name || 'avatar'} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  }
  const initials = (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: 'var(--border)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 700, color: 'var(--muted)', flexShrink: 0,
    }}>
      {initials}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Admin() {
  const { user }                        = useAuth()
  const { isAdmin, loading: planLoading } = usePlan()
  const navigate                        = useNavigate()

  const [users, setUsers]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [search, setSearch]     = useState('')
  const [roleFilter, setRoleFilter] = useState('all') // all | landlord | tenant
  const [toast, setToast]       = useState(null)      // { msg, ok }
  const [pending, setPending]   = useState({})        // userId → true while updating
  const [copied, setCopied]     = useState(false)
  const [isDemo, setIsDemo]     = useState(false)

  const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin
  const inviteLink = `${siteUrl}/auth`

  // ── Show toast ──────────────────────────────────────────────────────────────
  const showToast = useCallback((msg, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }, [])

  // ── Load users ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (planLoading) return
    if (!isAdmin) { navigate('/dashboard'); return }

    if (isDemoUser(user)) {
      setIsDemo(true)
      setUsers(DEMO_USERS)
      setLoading(false)
      return
    }

    supabase.rpc('get_all_profiles_for_admin')
      .then(({ data, error: err }) => {
        if (err) throw err
        setUsers(data || [])
        setLoading(false)
      })
      .catch(err => {
        setError(err.message || 'Failed to load users')
        setLoading(false)
      })
  }, [isAdmin, planLoading])

  // ── Toggle active status ─────────────────────────────────────────────────────
  async function toggleActive(u) {
    if (isDemo) { showToast('Cannot modify users in demo mode', false); return }
    if (u.is_admin) { showToast('Cannot deactivate an admin account', false); return }
    const newVal = !u.is_active
    setPending(p => ({ ...p, [u.id]: true }))
    const { error: err } = await supabase
      .from('profiles')
      .update({ is_active: newVal })
      .eq('id', u.id)
    setPending(p => { const q = { ...p }; delete q[u.id]; return q })
    if (err) { showToast(err.message, false); return }
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_active: newVal } : x))
    showToast(`${u.email} ${newVal ? 'activated' : 'deactivated'}`)
  }

  // ── Change role ──────────────────────────────────────────────────────────────
  async function changeRole(u, newRole) {
    if (isDemo) { showToast('Cannot modify users in demo mode', false); return }
    if (u.is_admin) { showToast('Cannot change role of an admin account', false); return }
    setPending(p => ({ ...p, [u.id]: true }))
    const { error: err } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', u.id)
    setPending(p => { const q = { ...p }; delete q[u.id]; return q })
    if (err) { showToast(err.message, false); return }
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, role: newRole } : x))
    showToast(`${u.email} role → ${newRole}`)
  }

  // ── Change plan ──────────────────────────────────────────────────────────────
  async function changePlan(u, newPlan) {
    if (isDemo) { showToast('Cannot modify users in demo mode', false); return }
    if (u.is_admin) { showToast('Cannot change plan of an admin account', false); return }
    setPending(p => ({ ...p, [u.id]: true }))
    const { error: err } = await supabase
      .from('profiles')
      .update({ plan: newPlan })
      .eq('id', u.id)
    setPending(p => { const q = { ...p }; delete q[u.id]; return q })
    if (err) { showToast(err.message, false); return }
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, plan: newPlan } : x))
    showToast(`${u.email} plan → ${newPlan}`)
  }

  // ── Copy invite link ─────────────────────────────────────────────────────────
  function copyInvite() {
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // ── Filtered list ────────────────────────────────────────────────────────────
  const filtered = users.filter(u => {
    const matchSearch = !search
      || (u.email || '').toLowerCase().includes(search.toLowerCase())
      || (u.full_name || '').toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === 'all' || u.role === roleFilter
    return matchSearch && matchRole
  })

  const stats = computeStats(users)

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <Layout>
      <div className="page">

        {/* Toast */}
        {toast && (
          <div style={{
            position: 'fixed', top: 20, right: 20, zIndex: 9999,
            background: toast.ok ? '#1a1a2e' : '#7f1d1d',
            color: '#fff', padding: '10px 18px', borderRadius: 10,
            fontSize: 13, fontWeight: 600, boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            animation: 'fadeIn 0.2s ease',
          }}>
            {toast.ok ? '✓ ' : '⚠ '}{toast.msg}
          </div>
        )}

        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Admin</h1>
            <p className="page-subtitle">Platform overview · Vestry</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isDemo && (
              <span style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic' }}>demo mode</span>
            )}
            <div style={{
              background: '#1a1a2e', color: '#c4704a',
              padding: '6px 14px', borderRadius: 8,
              fontSize: 11, fontWeight: 800, letterSpacing: '0.1em',
            }}>
              ADMIN
            </div>
          </div>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>{error}</div>}

        {loading ? (
          <div className="spinner" />
        ) : (
          <>
            {/* KPI row */}
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
              <KpiCard
                label="Total Users"
                value={stats.total}
                sub={`${stats.byPlan.pro + stats.byPlan.portfolio} paying`}
              />
              <KpiCard
                label="MRR"
                value={fmt(stats.mrr)}
                sub={`${stats.byPlan.pro} Pro · ${stats.byPlan.portfolio} Portfolio`}
                accent="var(--accent)"
              />
              <KpiCard
                label="Total Properties"
                value={stats.properties}
                sub="across all accounts"
              />
              <KpiCard
                label="Free Accounts"
                value={stats.byPlan.free}
                sub="conversion targets"
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
                  const count = stats.byPlan[tier.key] || 0
                  const pct   = stats.total ? Math.round((count / stats.total) * 100) : 0
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

            {/* Invite section */}
            <div className="card" style={{ marginBottom: 20, padding: '18px 24px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 10 }}>
                Invite Users
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
                Share this link for new users to sign up. Anyone with the link can create an account.
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{
                  flex: 1, background: 'var(--bg)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '9px 14px', fontFamily: 'monospace',
                  fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {inviteLink}
                </div>
                <button
                  onClick={copyInvite}
                  style={{
                    background: copied ? '#10b981' : 'var(--accent)',
                    color: '#fff', border: 'none', borderRadius: 8,
                    padding: '9px 18px', fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', transition: 'background 0.2s', whiteSpace: 'nowrap',
                  }}
                >
                  {copied ? '✓ Copied' : 'Copy Link'}
                </button>
              </div>
            </div>

            {/* User table */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                  All Accounts
                  <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>
                    {filtered.length === users.length
                      ? `${users.length} ${users.length === 1 ? 'account' : 'accounts'}`
                      : `${filtered.length} of ${users.length}`}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  {/* Role filter */}
                  <select
                    value={roleFilter}
                    onChange={e => setRoleFilter(e.target.value)}
                    className="form-input"
                    style={{ fontSize: 12.5, padding: '7px 10px', width: 130 }}
                  >
                    <option value="all">All roles</option>
                    <option value="landlord">Landlords</option>
                    <option value="tenant">Tenants</option>
                    <option value="admin">Admins</option>
                  </select>
                  <input
                    className="form-input"
                    placeholder="Search name or email…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ width: 220, fontSize: 12.5, padding: '7px 12px' }}
                  />
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Role</th>
                      <th>Plan</th>
                      <th style={{ textAlign: 'center' }}>Properties</th>
                      <th>Joined</th>
                      <th style={{ textAlign: 'center' }}>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(u => {
                      const isPending = !!pending[u.id]
                      return (
                        <tr key={u.id} style={{ opacity: isPending ? 0.6 : 1, transition: 'opacity 0.2s' }}>
                          {/* User */}
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <Avatar url={u.avatar_url} name={u.full_name || u.email} />
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 5 }}>
                                  {u.full_name || '—'}
                                  {u.is_admin && (
                                    <span style={{ fontSize: 9, background: '#1a1a2e', color: '#c4704a', padding: '1px 5px', borderRadius: 3, fontWeight: 800 }}>
                                      ADMIN
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: 11.5, color: 'var(--muted)', fontFamily: 'monospace' }}>{u.email}</div>
                              </div>
                            </div>
                          </td>

                          {/* Role */}
                          <td>
                            {u.is_admin ? (
                              <span style={{ fontSize: 12, color: 'var(--muted)' }}>admin</span>
                            ) : (
                              <select
                                value={u.role || ''}
                                onChange={e => changeRole(u, e.target.value)}
                                disabled={isPending}
                                style={{
                                  fontSize: 12, padding: '4px 8px', borderRadius: 6,
                                  border: '1px solid var(--border)', background: 'var(--card)',
                                  color: 'var(--text)', cursor: 'pointer',
                                }}
                              >
                                <option value="">— no role</option>
                                <option value="landlord">Landlord</option>
                                <option value="tenant">Tenant</option>
                              </select>
                            )}
                          </td>

                          {/* Plan */}
                          <td>
                            {u.is_admin ? (
                              <PlanBadge plan={u.plan} isAdmin />
                            ) : (
                              <select
                                value={u.plan || 'free'}
                                onChange={e => changePlan(u, e.target.value)}
                                disabled={isPending}
                                style={{
                                  fontSize: 12, padding: '4px 8px', borderRadius: 6,
                                  border: '1px solid var(--border)', background: 'var(--card)',
                                  color: 'var(--text)', cursor: 'pointer',
                                }}
                              >
                                <option value="free">Free</option>
                                <option value="pro">Pro</option>
                                <option value="portfolio">Portfolio</option>
                              </select>
                            )}
                          </td>

                          {/* Properties */}
                          <td style={{ textAlign: 'center', fontSize: 13, color: Number(u.property_count) > 0 ? 'var(--text)' : 'var(--muted)' }}>
                            {u.property_count ?? 0}
                          </td>

                          {/* Joined */}
                          <td style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                            {fmtDate(u.created_at)}
                          </td>

                          {/* Status */}
                          <td style={{ textAlign: 'center' }}>
                            {u.is_admin ? (
                              <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>● Active</span>
                            ) : u.is_active ? (
                              <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>● Active</span>
                            ) : (
                              <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 600 }}>● Inactive</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td style={{ textAlign: 'right' }}>
                            {!u.is_admin && (
                              <button
                                onClick={() => toggleActive(u)}
                                disabled={isPending}
                                style={{
                                  fontSize: 11.5, fontWeight: 600,
                                  padding: '5px 12px', borderRadius: 6, cursor: 'pointer',
                                  border: '1px solid var(--border)',
                                  background: u.is_active ? 'transparent' : 'var(--accent)',
                                  color: u.is_active ? 'var(--muted)' : '#fff',
                                  transition: 'all 0.15s',
                                }}
                              >
                                {isPending ? '…' : u.is_active ? 'Deactivate' : 'Activate'}
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', color: 'var(--muted)', padding: 32, fontSize: 13 }}>
                          No accounts match your search
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
