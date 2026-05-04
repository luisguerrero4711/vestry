import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import Layout from '../components/Layout'
import { VT, VIcon, VPill, VAvatar, VSection } from '../lib/vestry-shared'

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
function NetIncomeChart() {
  const data = [1620, 1780, 1850, 1720, 1900, 1925]
  const months = ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May']
  const w = 540, h = 140
  const padX = 8, padY = 16
  const max = Math.max(...data) * 1.1
  const min = Math.min(...data) * 0.85
  const range = max - min
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
      }}>$1,925 net <span style={{ color: 'rgba(255,255,255,0.6)' }}>· May</span></div>
    </div>
  )
}

// ── Dashboard page ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ collected: '$2,650', outstanding: '$1,800', expenses: '$725', net: '$1,925' })

  useEffect(() => {
    if (!user) navigate('/auth')
  }, [user, navigate])

  const firstName = user?.email?.split('@')[0]?.split('.')[0] || 'Luis'
  const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1)

  const today = new Date()
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <Layout>
      <div style={{ padding: '28px 28px 32px', overflow: 'auto', height: '100%', background: VT.page }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 18 }}>
          <StatCard label="Collected"   value="$2,650" delta="12.4%"   deltaPositive sparkline={[1800,1900,1850,2100,2400,2350,2650]} accent="var(--brand)" />
          <StatCard label="Outstanding" value="$1,800" delta="1 late"  deltaPositive={false} sparkline={[400,200,800,1200,900,1500,1800]} accent="var(--red)" />
          <StatCard label="Expenses"    value="$725"   delta="3 logged" deltaPositive sparkline={[200,180,300,250,400,500,725]} accent="var(--amber)" />
          <StatCard label="Net Income"  value="$1,925" delta="3.8%"    deltaPositive sparkline={[1620,1780,1850,1720,1900,1925]} accent="var(--green)" />
        </div>

        {/* Charts row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 14, marginBottom: 18 }}>
          <div style={{ background: VT.card, borderRadius: 'var(--r-md)', padding: 22, boxShadow: VT.shadowCard }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 13, color: VT.text2, fontWeight: 500 }}>Net income</div>
                <div style={{ fontFamily: VT.fontDisplay, fontSize: 26, fontWeight: 600, letterSpacing: '-0.025em', marginTop: 2 }}>
                  $11,795 <span style={{ color: VT.text3, fontSize: 14, fontWeight: 500 }}>· last 6 months</span>
                </div>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6, background: VT.greenTint, color: VT.green, fontSize: 12, fontWeight: 600 }}>
                <VIcon.Up s={11} c="var(--green)" /> Healthy
              </div>
            </div>
            <NetIncomeChart />
          </div>

          <div style={{ background: VT.card, borderRadius: 'var(--r-md)', padding: 22, boxShadow: VT.shadowCard, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 13, color: VT.text2, fontWeight: 500, marginBottom: 4 }}>Collection rate · May</div>
            <div style={{ fontFamily: VT.fontDisplay, fontSize: 15, fontWeight: 500, color: VT.text1, letterSpacing: '-0.01em' }}>2 of 3 paid</div>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, padding: '12px 0' }}>
              <CollectionDonut pct={60} size={130} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 10, borderTop: `1px solid ${VT.line}` }}>
              {[['Paid', '$2,650', VT.green], ['Outstanding', '$1,800', VT.red]].map(([l, v, c]) => (
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

        {/* Overdue alert */}
        <div style={{
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
              <span style={{ fontFamily: VT.fontDisplay, fontSize: 15, fontWeight: 600, letterSpacing: '-0.02em' }}>Priya Patel's rent is overdue</span>
              <VPill tone="danger">2 days late</VPill>
            </div>
            <div style={{ fontSize: 13, color: VT.text2, marginTop: 3, fontWeight: 500 }}>$1,800 · Riverside Condo · Due May 1</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{
              padding: '8px 14px', background: 'transparent', border: `1px solid ${VT.line}`,
              borderRadius: 8, fontSize: 13, fontWeight: 600, color: VT.text1, cursor: 'pointer',
            }}>Send reminder</button>
            <button style={{
              padding: '8px 14px', background: VT.brand, border: 'none',
              borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(37,99,235,0.3)',
            }}>Mark paid</button>
          </div>
        </div>

        {/* Recent rent table */}
        <VSection
          title="Recent rent"
          subtitle="May 2026 · 3 tenants"
          padding={0}
          action={
            <button style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, color: VT.brand,
            }}>View all <VIcon.Chevron s={14} c="var(--brand)" /></button>
          }
        >
          {[
            { init: 'SC', color: '#FF6B6B', name: 'Sarah Chen',      prop: 'Oak Street Duplex · Unit A', amount: '$1,450', status: 'success', label: 'Paid May 1',    method: 'Bank transfer' },
            { init: 'MW', color: '#4ECDC4', name: 'Marcus Williams', prop: 'Oak Street Duplex · Unit B', amount: '$1,200', status: 'success', label: 'Paid May 3',    method: 'Check' },
            { init: 'PP', color: '#FFD93D', name: 'Priya Patel',     prop: 'Riverside Condo',            amount: '$1,800', status: 'danger',  label: 'Overdue · 2d', method: 'Awaiting' },
          ].map((r, i, arr) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 120px 120px 20px',
              gap: 12, alignItems: 'center', padding: '14px 20px',
              borderBottom: i < arr.length - 1 ? `1px solid ${VT.line}` : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <VAvatar initials={r.init} size={36} color={r.color} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em' }}>{r.name}</div>
                  <div style={{ fontSize: 12, color: VT.text3, fontWeight: 500, marginTop: 1 }}>{r.method}</div>
                </div>
              </div>
              <div style={{ fontSize: 13, color: VT.text2, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.prop}</div>
              <div style={{ fontFamily: VT.fontDisplay, fontSize: 15, fontWeight: 600, letterSpacing: '-0.02em' }}>{r.amount}</div>
              <VPill tone={r.status}>{r.label}</VPill>
              <VIcon.Chevron s={16} c="var(--text-3)" />
            </div>
          ))}
        </VSection>
      </div>
    </Layout>
  )
}
