import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import Layout from '../components/Layout'
import { isDemoUser } from '../lib/demoData'
import { VT, VIcon, VPill, VAvatar, VSection } from '../lib/vestry-shared'
import UpgradeGate from '../components/UpgradeGate'

// ── Sparkline stat card ──────────────────────────────────────────────────────
function StatCard({ label, value, delta, deltaPositive, sparkline, accent }) {
  const w = 180, h = 44
  const max = Math.max(...sparkline)
  const min = Math.min(...sparkline)
  const range = max - min || 1
  const path = sparkline.map((v, i) => {
    const x = (i / (sparkline.length - 1)) * w
    const y = h - ((v - min) / range) * h
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  const areaPath = `${path} L${w},${h} L0,${h} Z`
  const sparkId = `spark-${label.replace(/\s/g, '')}`

  return (
    <div style={{
      padding: 20, borderRadius: 'var(--r-md)',
      background: VT.card, boxShadow: VT.shadowCard,
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{ fontFamily: VT.fontText, fontSize: 13, fontWeight: 500, color: VT.text2, letterSpacing: '-0.01em' }}>{label}</div>
      <div style={{ fontFamily: VT.fontDisplay, fontSize: 28, fontWeight: 600, color: VT.text1, letterSpacing: '-0.025em', lineHeight: 1.1 }}>{value}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 3,
          fontFamily: VT.fontText, fontSize: 12, fontWeight: 500,
          color: deltaPositive ? VT.green : VT.red,
        }}>
          <VIcon.Up s={11} c={deltaPositive ? 'var(--green)' : 'var(--red)'} />
          {delta}
        </div>
        <svg width={w * 0.55} height={h * 0.7} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id={sparkId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={accent || 'var(--brand)'} stopOpacity="0.18" />
              <stop offset="100%" stopColor={accent || 'var(--brand)'} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#${sparkId})`} />
          <path d={path} fill="none" stroke={accent || 'var(--brand)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  )
}

// ── Collection donut ─────────────────────────────────────────────────────────
function CollectionDonut({ pct = 60, size = 140 }) {
  const r = (size - 16) / 2
  const c = 2 * Math.PI * r
  const dash = (pct / 100) * c
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-tint)" strokeWidth="10" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--brand)" strokeWidth="10"
          strokeDasharray={`${dash} ${c}`} strokeLinecap="round" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: VT.fontDisplay, fontSize: 28, fontWeight: 600, color: VT.text1, letterSpacing: '-0.03em', lineHeight: 1 }}>{pct}%</div>
        <div style={{ fontFamily: VT.fontText, fontSize: 11, color: VT.text3, marginTop: 4, fontWeight: 500 }}>collected</div>
      </div>
    </div>
  )
}

// ── Net income bezier chart ───────────────────────────────────────────────────
function NetIncomeChart({ data: rawData, months: rawMonths }) {
  const data = rawData || [1620, 1780, 1850, 1720, 1900, 1925]
  const months = rawMonths || ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May']
  const w = 540, h = 140
  const padX = 8, padY = 16
  const max = Math.max(...data) * 1.1
  const min = Math.min(...data) * 0.85
  const range = max - min || 1
  const stepX = (w - padX * 2) / (data.length - 1)
  const points = data.map((v, i) => ({
    x: padX + i * stepX,
    y: padY + (1 - (v - min) / range) * (h - padY * 2),
    v,
  }))
  let d = `M${points[0].x},${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1], p1 = points[i]
    const cx = (p0.x + p1.x) / 2
    d += ` C${cx},${p0.y} ${cx},${p1.y} ${p1.x},${p1.y}`
  }
  const area = `${d} L${points[points.length - 1].x},${h - padY} L${padX},${h - padY} Z`
  const lastVal = data[data.length - 1]
  const lastMonth = months[months.length - 1]

  return (
    <div style={{ position: 'relative' }}>
      <svg width="100%" viewBox={`0 0 ${w} ${h + 24}`} style={{ display: 'block' }}>
        <defs>
          <linearGradient id="netGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((t, i) => (
          <line key={i} x1={padX} x2={w - padX}
            y1={padY + t * (h - padY * 2)} y2={padY + t * (h - padY * 2)}
            stroke="var(--line)" strokeWidth="0.5" strokeDasharray="2 3" />
        ))}
        <path d={area} fill="url(#netGrad)" />
        <path d={d} fill="none" stroke="var(--brand)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={i === points.length - 1 ? 5 : 0} fill="var(--brand)" />
            <circle cx={p.x} cy={p.y} r={i === points.length - 1 ? 2 : 0} fill="#fff" />
          </g>
        ))}
        {points.map((p, i) => (
          <text key={i} x={p.x} y={h + 12} textAnchor="middle"
            fontFamily="var(--font-text)" fontSize="11" fontWeight="500" fill="var(--text-3)">{months[i]}</text>
        ))}
      </svg>
      <div style={{
        position: 'absolute', right: '6%', top: 8,
        background: VT.text1, color: '#fff',
        padding: '5px 9px', borderRadius: 8,
        fontFamily: VT.fontText, fontSize: 12, fontWeight: 500,
        boxShadow: VT.shadowMd, letterSpacing: '-0.01em',
      }}>${lastVal.toLocaleString()} net <span style={{ color: 'rgba(255,255,255,0.6)' }}>· {lastMonth}</span></div>
    </div>
  )
}

const AVATAR_COLORS = ['#FF6B6B','#4ECDC4','#FFD93D','#A78BFA','#60A5FA','#34D399','#F472B6','#FB923C']
function avatarColor(name = '') {
  return AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length]
}
function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
}
function fmt(n) { return `$${Math.round(n).toLocaleString()}` }

// ── Dashboard page ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [dashData, setDashData] = useState(null)

  useEffect(() => {
    if (!user) { navigate('/auth'); return }

    if (isDemoUser(user)) {
      setDashData({
        collected: 2650, outstanding: 1800, expenses: 725, net: 1925,
        collectionPct: 60, paidCount: 2, totalCount: 3,
        overdue: [{ name: "Priya Patel", prop: "Riverside Condo", amount: 1800, days: 2 }],
        recent: [
          { init: 'SC', color: '#FF6B6B', name: 'Sarah Chen',      prop: 'Oak Street Duplex · Unit A', amount: 1450, status: 'paid',    label: 'Paid May 1',    method: 'Bank transfer' },
          { init: 'MW', color: '#4ECDC4', name: 'Marcus Williams', prop: 'Oak Street Duplex · Unit B', amount: 1200, status: 'paid',    label: 'Paid May 3',    method: 'Check' },
          { init: 'PP', color: '#FFD93D', name: 'Priya Patel',     prop: 'Riverside Condo',            amount: 1800, status: 'overdue', label: 'Overdue · 2d', method: 'Awaiting' },
        ],
        netChartData: [1620, 1780, 1850, 1720, 1900, 1925],
        netChartMonths: ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'],
        netTotal: 11795,
      })
      setLoading(false)
      return
    }

    // Real data fetch
    async function load() {
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)

      const [
        { data: paidData },
        { data: overdueData },
        { data: expenseData },
        { data: recentData },
        { data: activeLeases },
      ] = await Promise.all([
        // Paid this month
        supabase.from('rent_payments')
          .select('amount')
          .eq('user_id', user.id)
          .eq('status', 'paid')
          .gte('paid_date', monthStart)
          .lte('paid_date', monthEnd),
        // Overdue
        supabase.from('rent_payments')
          .select('amount, due_date, tenants(first_name, last_name), properties(name)')
          .eq('user_id', user.id)
          .eq('status', 'overdue'),
        // Expenses this month
        supabase.from('expenses')
          .select('amount')
          .eq('user_id', user.id)
          .gte('date', monthStart)
          .lte('date', monthEnd),
        // Recent payments
        supabase.from('rent_payments')
          .select('*, tenants(first_name, last_name), properties(name)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5),
        // Active lease count (denominator for collection rate)
        supabase.from('leases')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'active'),
      ])

      const collected = (paidData || []).reduce((s, p) => s + Number(p.amount || 0), 0)
      const outstanding = (overdueData || []).reduce((s, p) => s + Number(p.amount || 0), 0)
      const expenses = (expenseData || []).reduce((s, p) => s + Number(p.amount || 0), 0)
      const net = collected - expenses
      const paidCount = (paidData || []).length
      const total = (activeLeases || []).length || paidCount || 1
      const collectionPct = total > 0 ? Math.round((paidCount / total) * 100) : 0

      const overdue = (overdueData || []).map(p => {
        const name = p.tenants ? `${p.tenants.first_name} ${p.tenants.last_name}`.trim() : 'Tenant'
        const dueDate = p.due_date ? new Date(p.due_date + 'T00:00:00') : null
        const days = dueDate ? Math.max(0, Math.round((Date.now() - dueDate.getTime()) / 86400000)) : 0
        return { name, prop: p.properties?.name || '—', amount: Number(p.amount || 0), days }
      })

      const recent = (recentData || []).map(p => {
        const name = p.tenants ? `${p.tenants.first_name} ${p.tenants.last_name}`.trim() : '—'
        const dateLabel = (p.paid_date || p.due_date)
          ? new Date((p.paid_date || p.due_date) + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : '—'
        const label = p.status === 'paid' ? `Paid ${dateLabel}` : p.status === 'overdue' ? 'Overdue' : p.status === 'due' ? `Due ${dateLabel}` : p.status
        return {
          init: name !== '—' ? name.slice(0, 2).toUpperCase() : '?',
          color: avatarColor(name),
          name,
          prop: p.properties?.name || '—',
          amount: Number(p.amount || 0),
          status: p.status === 'paid' ? 'success' : p.status === 'overdue' ? 'danger' : 'warn',
          label,
          method: { bank_transfer: 'Bank transfer', check: 'Check', cash: 'Cash', venmo: 'Venmo', zelle: 'Zelle' }[p.payment_method] || p.payment_method || '—',
        }
      })

      setDashData({
        collected, outstanding, expenses, net,
        collectionPct, paidCount, totalCount: total,
        overdue, recent,
        netChartData: [net, net, net, net, net, net], // placeholder until multi-month data
        netChartMonths: ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'],
        netTotal: net,
      })
      setLoading(false)
    }
    load()
  }, [user, navigate])

  const firstName = user?.email?.split('@')[0]?.split('.')[0] || 'there'
  const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1)
  const today = new Date()
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  if (loading || !dashData) {
    return (
      <Layout>
        <div className="v-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
          <div style={{ color: VT.text3, fontWeight: 500, fontSize: 14 }}>Loading dashboard…</div>
        </div>
      </Layout>
    )
  }

  const { collected, outstanding, expenses, net, collectionPct, paidCount, totalCount, overdue, recent, netChartData, netChartMonths, netTotal } = dashData

  return (
    <Layout>
      <div className="v-page">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontFamily: VT.fontText, fontSize: 13, color: VT.text3, fontWeight: 500, marginBottom: 4 }}>{dateStr}</div>
            <h1 style={{ fontFamily: VT.fontDisplay, fontSize: 30, fontWeight: 600, margin: 0, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              Good morning, {displayName}
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 4, padding: 4, background: VT.tint, borderRadius: 10 }}>
            {['Day', 'Week', 'Month', 'Year'].map((p, i) => (
              <button key={p} style={{
                padding: '6px 14px', border: 'none', cursor: 'pointer',
                background: i === 2 ? VT.card : 'transparent',
                color: i === 2 ? VT.text1 : VT.text2,
                fontFamily: VT.fontText, fontSize: 12, fontWeight: 600, borderRadius: 7,
                boxShadow: i === 2 ? VT.shadowCard : 'none', letterSpacing: '-0.01em',
              }}>{p}</button>
            ))}
          </div>
        </div>

        {/* Stat cards */}
        <div className="v-grid-4 v-mb-18">
          <StatCard label="Collected"   value={fmt(collected)}   delta="this month"  deltaPositive sparkline={[0, collected * 0.3, collected * 0.5, collected * 0.7, collected * 0.9, collected]} accent="var(--brand)" />
          <StatCard label="Outstanding" value={fmt(outstanding)} delta={overdue.length > 0 ? `${overdue.length} overdue` : 'All clear'} deltaPositive={outstanding === 0} sparkline={[0, outstanding]} accent="var(--red)" />
          <StatCard label="Expenses"    value={fmt(expenses)}    delta="this month"  deltaPositive={false} sparkline={[0, expenses * 0.4, expenses * 0.7, expenses]} accent="var(--amber)" />
          <StatCard label="Net Income"  value={fmt(net)}         delta="this month"  deltaPositive={net >= 0} sparkline={[0, net * 0.3, net * 0.6, net * 0.8, net]} accent="var(--green)" />
        </div>

        {/* Charts row */}
        <div className="v-chart-row v-mb-18">
          <div style={{ background: VT.card, borderRadius: 'var(--r-md)', padding: 22, boxShadow: VT.shadowCard }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 13, color: VT.text2, fontWeight: 500 }}>Net income</div>
                <div style={{ fontFamily: VT.fontDisplay, fontSize: 26, fontWeight: 600, letterSpacing: '-0.025em', marginTop: 2 }}>
                  {fmt(netTotal)} <span style={{ color: VT.text3, fontSize: 14, fontWeight: 500 }}>· this month</span>
                </div>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6, background: net >= 0 ? VT.greenTint : VT.redTint, color: net >= 0 ? VT.green : VT.red, fontSize: 12, fontWeight: 600 }}>
                <VIcon.Up s={11} c={net >= 0 ? 'var(--green)' : 'var(--red)'} /> {net >= 0 ? 'Healthy' : 'Deficit'}
              </div>
            </div>
            <NetIncomeChart data={netChartData} months={netChartMonths} />
          </div>

          <div style={{ background: VT.card, borderRadius: 'var(--r-md)', padding: 22, boxShadow: VT.shadowCard, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 13, color: VT.text2, fontWeight: 500, marginBottom: 4 }}>Collection rate · this month</div>
            <div style={{ fontFamily: VT.fontDisplay, fontSize: 15, fontWeight: 500, color: VT.text1, letterSpacing: '-0.01em' }}>{paidCount} of {totalCount} paid</div>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, padding: '12px 0' }}>
              <CollectionDonut pct={collectionPct} size={130} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 10, borderTop: `1px solid ${VT.line}` }}>
              {[[`Paid (${paidCount})`, fmt(collected), VT.green], [`Outstanding`, fmt(outstanding), VT.red]].map(([l, v, c]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 500, color: VT.text2 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: c }} /> {l}
                  </div>
                  <div style={{ fontFamily: VT.fontDisplay, fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Overdue alerts */}
        {overdue.length > 0 && overdue.map((od, i) => (
          <div key={i} style={{
            background: VT.card, borderRadius: 'var(--r-md)', boxShadow: VT.shadowCard,
            padding: 18, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, background: VT.redTint,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" />
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: VT.fontDisplay, fontSize: 15, fontWeight: 600, letterSpacing: '-0.02em' }}>{od.name}'s rent is overdue</span>
                <VPill tone="danger">{od.days > 0 ? `${od.days}d late` : 'Overdue'}</VPill>
              </div>
              <div style={{ fontSize: 13, color: VT.text2, marginTop: 3, fontWeight: 500 }}>{fmt(od.amount)} · {od.prop}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <UpgradeGate feature="reminders">
                <button onClick={() => navigate('/payments')} style={{
                  padding: '8px 14px', background: 'transparent', border: `1px solid ${VT.line}`,
                  borderRadius: 8, fontSize: 13, fontWeight: 600, color: VT.text1, cursor: 'pointer',
                }}>Send reminder</button>
              </UpgradeGate>
            </div>
          </div>
        ))}

        {/* Recent rent table */}
        <VSection
          title="Recent payments"
          subtitle={`${recent.length} most recent`}
          padding={0}
          action={
            <button onClick={() => navigate('/payments')} style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, color: VT.brand,
            }}>View all <VIcon.Chevron s={14} c="var(--brand)" /></button>
          }
        >
          {recent.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: VT.text3, fontWeight: 500, fontSize: 13 }}>
              No payments recorded yet. <button onClick={() => navigate('/payments')} style={{ background: 'none', border: 'none', color: VT.brand, fontWeight: 600, cursor: 'pointer' }}>Record one →</button>
            </div>
          ) : recent.map((r, i, arr) => (
            <div key={i} className="v-pay-row" style={{
              borderBottom: i < arr.length - 1 ? `1px solid ${VT.line}` : 'none',
              padding: '14px 20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <VAvatar initials={r.init} size={36} color={r.color} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                  <div style={{ fontSize: 12, color: VT.text3, fontWeight: 500, marginTop: 1 }}>{r.method}</div>
                </div>
              </div>
              <div className="v-pay-row-prop" style={{ fontSize: 13, color: VT.text2, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.prop}</div>
              <div style={{ fontFamily: VT.fontDisplay, fontSize: 15, fontWeight: 600, letterSpacing: '-0.02em' }}>{fmt(r.amount)}</div>
              <VPill tone={r.status}>{r.label}</VPill>
              <div className="v-pay-row-chevron"><VIcon.Chevron s={16} c="var(--text-3)" /></div>
            </div>
          ))}
        </VSection>
      </div>
    </Layout>
  )
}
