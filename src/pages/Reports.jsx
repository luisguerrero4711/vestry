import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import Layout from '../components/Layout'
import { isDemoUser, demoProperties, demoPayments, demoExpenses, demoLeases } from '../lib/demoData'
import { VT, VSection } from '../lib/vestry-shared'
import { computeOccupancy } from '../lib/derive'
import { rowCents, fromCents } from '../lib/money'

// rent income only: exclude deposits, imported opening balances, and reversed rows
const rentOnly = (p) => (!p.type || p.type === 'rent' || p.type === 'fee') && p.state !== 'reversed'
const sumRent = (list) => fromCents((list || []).filter(rentOnly).reduce((s, p) => s + rowCents(p), 0))

const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n ?? 0)
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function Reports() {
  const { user } = useAuth()
  const [properties, setProps] = useState([])
  const [payments, setPays] = useState([])
  const [expenses, setExp] = useState([])
  const [leases, setLeases] = useState([])
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())
  const [propFilter, setProp] = useState('all')

  useEffect(() => { if (user) fetchData() /* eslint-disable-next-line */ }, [user, year])

  const fetchData = async () => {
    setLoading(true)
    if (isDemoUser(user)) {
      setProps(demoProperties.map(p => ({ id: p.id, name: p.name, city: p.city, state: p.state, units: p.units || [] })))
      setPays(demoPayments.filter(p => p.status === 'paid' && p.paid_date?.startsWith(String(year))))
      setExp(demoExpenses.filter(e => e.date?.startsWith(String(year))))
      setLeases(demoLeases)
      setLoading(false)
      return
    }
    const [{ data: ps }, { data: pays }, { data: exps }, { data: ls }] = await Promise.all([
      supabase.from('properties').select('id,name,city,state, units(id)').eq('user_id', user.id),
      supabase.from('rent_payments').select('*').eq('user_id', user.id).gte('paid_date', `${year}-01-01`).lte('paid_date', `${year}-12-31`).eq('status', 'paid'),
      supabase.from('expenses').select('*').eq('user_id', user.id).gte('date', `${year}-01-01`).lte('date', `${year}-12-31`),
      supabase.from('leases').select('unit_id, property_id, status').eq('user_id', user.id),
    ])
    setProps(ps ?? []); setPays(pays ?? []); setExp(exps ?? []); setLeases(ls ?? [])
    setLoading(false)
  }

  const filtPays = propFilter === 'all' ? payments : payments.filter(p => p.property_id === propFilter)
  const filtExps = propFilter === 'all' ? expenses : expenses.filter(e => e.property_id === propFilter)

  const totalCollected = sumRent(filtPays)
  const totalExpenses = filtExps.reduce((s, e) => s + Number(e.amount), 0)
  const netIncome = totalCollected - totalExpenses

  const allUnits = properties.flatMap(p => p.units || [])
  const scopedUnits = propFilter === 'all' ? allUnits : (properties.find(p => p.id === propFilter)?.units || [])
  const scopedLeases = propFilter === 'all' ? leases : leases.filter(l => l.property_id === propFilter)
  const occ = computeOccupancy(scopedUnits, scopedLeases)

  const monthly = MONTHS.map((label, idx) => {
    const m = String(idx + 1).padStart(2, '0')
    const collected = sumRent(filtPays.filter(p => p.paid_date?.startsWith(`${year}-${m}`)))
    const expTotal = filtExps.filter(e => e.date?.startsWith(`${year}-${m}`)).reduce((s, e) => s + Number(e.amount), 0)
    return { label, collected, expenses: expTotal, net: collected - expTotal }
  })

  const perProperty = properties.map(prop => {
    const collected = sumRent(payments.filter(p => p.property_id === prop.id))
    const expTotal = expenses.filter(e => e.property_id === prop.id).reduce((s, e) => s + Number(e.amount), 0)
    return { ...prop, collected, expenses: expTotal, net: collected - expTotal }
  })

  const maxBar = Math.max(...monthly.map(m => Math.max(m.collected, m.expenses)), 1)

  const th = { textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: VT.text3, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }
  const td = { padding: '12px 16px', fontSize: 13, fontWeight: 500 }
  const mono = { fontFamily: VT.fontNum, fontWeight: 600 }

  return (
    <Layout>
      <div className="v-page">
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 13, color: VT.text3, fontWeight: 500, marginBottom: 4 }}>Income, expenses, occupancy · {year}</div>
            <h1 style={{ fontFamily: VT.fontDisplay, fontSize: 30, fontWeight: 600, margin: 0, letterSpacing: '-0.03em', lineHeight: 1.1 }}>Reports</h1>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={() => setYear(y => y - 1)} style={{ padding: '6px 12px', border: `1px solid ${VT.line}`, borderRadius: 8, background: VT.card, cursor: 'pointer', fontWeight: 600, color: VT.text2 }}>◀</button>
            <span style={{ fontFamily: VT.fontNum, fontSize: 20, fontWeight: 600, minWidth: 56, textAlign: 'center' }}>{year}</span>
            <button onClick={() => setYear(y => y + 1)} style={{ padding: '6px 12px', border: `1px solid ${VT.line}`, borderRadius: 8, background: VT.card, cursor: 'pointer', fontWeight: 600, color: VT.text2 }}>▶</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
          {[{ id: 'all', name: 'All properties' }, ...properties].map(p => (
            <button key={p.id} onClick={() => setProp(p.id)} style={{
              padding: '7px 14px', border: `1px solid ${propFilter === p.id ? 'transparent' : VT.line}`, borderRadius: 100,
              background: propFilter === p.id ? VT.brandTint : 'transparent', color: propFilter === p.id ? VT.brand : VT.text2,
              fontSize: 12.5, fontWeight: propFilter === p.id ? 600 : 500, cursor: 'pointer', fontFamily: VT.fontText,
            }}>{p.name}</button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: VT.text3, fontWeight: 500 }}>Loading…</div>
        ) : (
          <>
            <div className="v-kpi-4 v-mb-20">
              {[
                { label: 'Total collected', value: fmt(totalCollected), color: VT.brand },
                { label: 'Total expenses', value: fmt(totalExpenses), color: VT.text1 },
                { label: 'Net income', value: fmt(netIncome), color: netIncome >= 0 ? VT.green : VT.red },
                { label: 'Occupancy', value: `${occ.pct}%`, color: VT.green, sub: `${occ.occupiedUnits}/${occ.totalUnits} units` },
              ].map(k => (
                <div key={k.label} style={{ background: VT.card, border: `1px solid ${VT.line}`, borderRadius: 'var(--r-md)', padding: '16px 20px' }}>
                  <div style={{ fontFamily: VT.fontNum, fontSize: 32, fontWeight: 600, lineHeight: 1, marginBottom: 4, color: k.color }}>{k.value}</div>
                  <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: VT.text3 }}>{k.label}</div>
                  {k.sub && <div style={{ fontSize: 11, color: VT.text3, fontWeight: 500, marginTop: 2 }}>{k.sub}</div>}
                </div>
              ))}
            </div>

            <VSection title={`Monthly breakdown — ${year}`}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginBottom: 10 }}>
                {monthly.map(m => {
                  const H = 160
                  const colH = Math.max(Math.round((m.collected / maxBar) * H), m.collected > 0 ? 3 : 0)
                  const expH = Math.max(Math.round((m.expenses / maxBar) * H), m.expenses > 0 ? 3 : 0)
                  return (
                    <div key={m.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: '100%', height: H, display: 'flex', alignItems: 'flex-end', gap: 2 }}>
                        <div style={{ flex: 1, height: colH, background: VT.brand, borderRadius: '3px 3px 0 0' }} title={`Collected ${fmt(m.collected)}`} />
                        <div style={{ flex: 1, height: expH, background: VT.line, borderRadius: '3px 3px 0 0' }} title={`Expenses ${fmt(m.expenses)}`} />
                      </div>
                      <div style={{ fontSize: 10, color: VT.text3, fontWeight: 600 }}>{m.label}</div>
                    </div>
                  )
                })}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: VT.text3, fontWeight: 500 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: VT.brand, display: 'inline-block' }} /> Collected
                <span style={{ width: 10, height: 10, borderRadius: 2, background: VT.line, display: 'inline-block', marginLeft: 14 }} /> Expenses
              </div>
            </VSection>

            <div style={{ height: 16 }} />
            <VSection title="Monthly detail">
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
                  <thead><tr style={{ background: VT.tint }}>{['Month', 'Collected', 'Expenses', 'Net'].map((h, i) => <th key={i} style={th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {monthly.map(m => (
                      <tr key={m.label} style={{ borderTop: `1px solid ${VT.line}` }}>
                        <td style={td}>{m.label} {year}</td>
                        <td style={{ ...td, ...mono, color: VT.brand }}>{m.collected > 0 ? fmt(m.collected) : '—'}</td>
                        <td style={{ ...td, ...mono, color: VT.text3 }}>{m.expenses > 0 ? fmt(m.expenses) : '—'}</td>
                        <td style={{ ...td, ...mono, color: m.net >= 0 ? VT.green : VT.red }}>{(m.collected > 0 || m.expenses > 0) ? fmt(m.net) : '—'}</td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: `2px solid ${VT.line}`, background: VT.tint }}>
                      <td style={{ ...td, fontWeight: 700 }}>Total {year}</td>
                      <td style={{ ...td, ...mono, fontWeight: 700, color: VT.brand }}>{fmt(totalCollected)}</td>
                      <td style={{ ...td, ...mono, fontWeight: 700 }}>{fmt(totalExpenses)}</td>
                      <td style={{ ...td, ...mono, fontWeight: 700, color: netIncome >= 0 ? VT.green : VT.red }}>{fmt(netIncome)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </VSection>

            {properties.length > 1 && propFilter === 'all' && (
              <>
                <div style={{ height: 16 }} />
                <VSection title="Per-property summary">
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
                      <thead><tr style={{ background: VT.tint }}>{['Property', 'Location', 'Collected', 'Expenses', 'Net'].map((h, i) => <th key={i} style={th}>{h}</th>)}</tr></thead>
                      <tbody>
                        {perProperty.map(p => (
                          <tr key={p.id} style={{ borderTop: `1px solid ${VT.line}` }}>
                            <td style={{ ...td, fontWeight: 600 }}>{p.name}</td>
                            <td style={{ ...td, color: VT.text3 }}>{[p.city, p.state].filter(Boolean).join(', ') || '—'}</td>
                            <td style={{ ...td, ...mono, color: VT.brand }}>{fmt(p.collected)}</td>
                            <td style={{ ...td, ...mono }}>{fmt(p.expenses)}</td>
                            <td style={{ ...td, ...mono, color: p.net >= 0 ? VT.green : VT.red }}>{fmt(p.net)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </VSection>
              </>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}
