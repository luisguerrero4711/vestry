import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { usePlan, PLANS } from '../hooks/usePlan'
import Layout from '../components/Layout'
import { isDemoUser } from '../lib/demoData'
import { VT, VIcon, VPill, VSection } from '../lib/vestry-shared'

const FEATURES = {
  free:      ['1 property', 'Unlimited tenants', 'Manual rent tracking', 'Lease storage', 'Expense tracking', 'Basic reports'],
  pro:       ['Up to 5 properties', 'Unlimited tenants', 'Online rent payments (Stripe)', 'Automated rent reminders', 'Lease PDF storage', 'Full reports'],
  portfolio: ['Unlimited properties', 'Everything in Pro', 'Priority support', 'Custom reminder schedules', 'Team access (soon)'],
}
const ORDER = { free: 0, pro: 1, portfolio: 2 }

function Check() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
      <circle cx="8" cy="8" r="8" fill="var(--brand)" opacity="0.14" />
      <path d="M4.5 8l2.5 2.5 4.5-5" stroke="var(--brand)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function Pricing() {
  const { user } = useAuth()
  const { plan: currentPlan, isAdmin, loading, refetch } = usePlan()
  const navigate = useNavigate()
  const location = useLocation()
  const [busy, setBusy] = useState(null)   // planKey | 'portal'
  const [error, setError] = useState('')
  const [justUpgraded, setJustUpgraded] = useState(false)
  const pollRef = useRef(null)

  // Return from Stripe checkout — the webhook may lag, so poll a few times.
  useEffect(() => {
    if (new URLSearchParams(location.search).get('upgraded') !== 'true') return
    setJustUpgraded(true)
    let tries = 0
    pollRef.current = setInterval(() => {
      tries += 1
      refetch?.()
      if (tries >= 4) { clearInterval(pollRef.current); navigate('/pricing', { replace: true }) }
    }, 2000)
    return () => clearInterval(pollRef.current)
    // eslint-disable-next-line
  }, [location.search])

  const effectivePlan = isAdmin ? 'portfolio' : currentPlan

  const upgrade = async (planKey) => {
    if (isDemoUser(user)) { alert('Demo mode — sign up to subscribe.'); return }
    setBusy(planKey); setError('')
    try {
      const res = await fetch('/.netlify/functions/create-landlord-subscription', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: planKey, userId: user.id, userEmail: user.email }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error || 'Could not start checkout')
      window.location.href = data.url
    } catch (err) { setError(err.message); setBusy(null) }
  }

  const manageBilling = async () => {
    if (isDemoUser(user)) { alert('Demo mode — sign up to manage billing.'); return }
    setBusy('portal'); setError('')
    try {
      const res = await fetch('/.netlify/functions/landlord-billing-portal', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error || 'Could not open billing portal')
      window.open(data.url, '_blank')
    } catch (err) { setError(err.message) } finally { setBusy(null) }
  }

  return (
    <Layout>
      <div className="v-page">
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 13, color: VT.text3, fontWeight: 500, marginBottom: 4 }}>
              {isAdmin ? 'Admin — all features unlocked' : `You're on the ${PLANS[currentPlan]?.label || 'Free'} plan`}
            </div>
            <h1 style={{ fontFamily: VT.fontDisplay, fontSize: 30, fontWeight: 600, margin: 0, letterSpacing: '-0.03em', lineHeight: 1.1 }}>Plans &amp; billing</h1>
          </div>
          {!isAdmin && currentPlan !== 'free' && (
            <button onClick={manageBilling} disabled={!!busy} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px',
              background: VT.card, border: `1px solid ${VT.line}`, borderRadius: 8,
              fontSize: 13, fontWeight: 600, color: VT.text1, cursor: 'pointer',
            }}>{busy === 'portal' ? 'Opening…' : 'Manage billing'}</button>
          )}
        </div>

        {justUpgraded && (
          <div style={{ background: VT.greenTint, color: VT.green, borderRadius: 10, padding: '12px 16px', fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
            Payment confirmed — activating your {PLANS[effectivePlan]?.label} plan…
          </div>
        )}
        {error && (
          <div style={{ background: VT.redTint, color: VT.red, borderRadius: 10, padding: '12px 16px', fontSize: 13, fontWeight: 600, marginBottom: 16 }}>{error}</div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: VT.text3, fontWeight: 500 }}>Loading…</div>
        ) : (
          <>
            <div className="v-grid-3" style={{ alignItems: 'stretch' }}>
              {['free', 'pro', 'portfolio'].map(key => {
                const p = PLANS[key]
                const isCurrent = key === effectivePlan
                const isDowngrade = ORDER[key] < ORDER[effectivePlan]
                return (
                  <div key={key} style={{
                    background: VT.card, borderRadius: 'var(--r-md)',
                    border: `1.5px solid ${isCurrent ? 'var(--brand)' : VT.line}`,
                    boxShadow: VT.shadowCard, padding: '26px 22px',
                    display: 'flex', flexDirection: 'column', gap: 6,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: VT.text3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{p.label}</span>
                      {isCurrent && <VPill tone="brand">Current</VPill>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, margin: '6px 0 4px' }}>
                      {p.price === 0
                        ? <span style={{ fontFamily: VT.fontNum, fontSize: 34, fontWeight: 600 }}>Free</span>
                        : <><span style={{ fontFamily: VT.fontNum, fontSize: 34, fontWeight: 600 }}>${p.price}</span><span style={{ fontSize: 13, color: VT.text3, marginBottom: 6 }}>/mo</span></>}
                    </div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: '10px 0 18px', display: 'flex', flexDirection: 'column', gap: 9, flex: 1 }}>
                      {FEATURES[key].map(f => (
                        <li key={f} style={{ display: 'flex', gap: 8, fontSize: 13, color: VT.text2, fontWeight: 500 }}><Check />{f}</li>
                      ))}
                    </ul>
                    {isAdmin ? (
                      <div style={{ textAlign: 'center', fontSize: 13, color: VT.brand, fontWeight: 600, padding: '10px 0' }}>Included</div>
                    ) : isCurrent ? (
                      <div style={{ textAlign: 'center', fontSize: 13, color: VT.text3, fontWeight: 500, padding: '10px 0' }}>Your current plan</div>
                    ) : isDowngrade ? (
                      <button onClick={manageBilling} disabled={!!busy} style={{ padding: '10px', background: VT.tint, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, color: VT.text2, cursor: 'pointer' }}>
                        {busy === 'portal' ? 'Opening…' : 'Change in billing portal'}
                      </button>
                    ) : (
                      <button onClick={() => upgrade(key)} disabled={!!busy} style={{ padding: '10px', background: VT.brand, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer', opacity: busy === key ? 0.6 : 1 }}>
                        {busy === key ? 'Redirecting…' : `Get ${p.label}`}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            <div style={{ height: 20 }} />
            <VSection title="How payments work">
              <p style={{ fontSize: 13, color: VT.text2, fontWeight: 500, lineHeight: 1.7, margin: 0 }}>
                Vestry uses Stripe for all payment processing. When a tenant pays rent online, the card
                processing fee (~2.9% + 30¢) is added on top so you receive the full rent amount. Your
                Vestry subscription is billed separately and can be cancelled anytime from the billing portal.
              </p>
            </VSection>
          </>
        )}
      </div>
    </Layout>
  )
}
