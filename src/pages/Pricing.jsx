import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { usePlan, PLANS } from '../hooks/usePlan'
import Layout from '../components/Layout'
import { isDemoUser } from '../lib/demoData'

const FEATURES = {
  free: [
    '1 property',
    'Unlimited tenants',
    'Manual rent tracking',
    'Lease storage',
    'Expense tracking',
    'Basic reports',
  ],
  pro: [
    'Up to 5 properties',
    'Unlimited tenants',
    'Stripe online payments',
    'Automated rent reminders',
    'Lease PDF storage',
    'Expense tracking',
    'Full reports',
  ],
  portfolio: [
    'Unlimited properties',
    'Unlimited tenants',
    'Stripe online payments',
    'Automated rent reminders',
    'Lease PDF storage',
    'Expense tracking',
    'Full reports',
    'Priority support',
    'Custom reminder schedules',
  ],
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
      <circle cx="8" cy="8" r="8" fill="var(--accent)" opacity="0.15" />
      <path d="M4.5 8l2.5 2.5 4.5-5" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PlanCard({ planKey, currentPlan, isAdmin, onUpgrade, loadingPlan }) {
  const plan    = PLANS[planKey]
  const isCurrent = planKey === currentPlan
  const isHigher  = planKey === 'portfolio' && currentPlan === 'pro'
  const isPro     = planKey === 'pro'

  const canUpgrade = !isCurrent && !isAdmin && planKey !== 'free'

  return (
    <div style={{
      background: isPro ? 'var(--card)' : 'var(--card)',
      border: `2px solid ${isCurrent ? 'var(--accent)' : isPro ? 'var(--accent)' : 'var(--border)'}`,
      borderRadius: 16,
      padding: '32px 28px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      position: 'relative',
      flex: 1,
      minWidth: 240,
    }}>
      {isPro && !isCurrent && (
        <div style={{
          position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--accent)', color: '#fff',
          padding: '3px 14px', borderRadius: 20, fontSize: 11, fontWeight: 700,
          letterSpacing: '0.06em', whiteSpace: 'nowrap',
        }}>
          MOST POPULAR
        </div>
      )}
      {isCurrent && (
        <div style={{
          position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--success, #2e7d32)', color: '#fff',
          padding: '3px 14px', borderRadius: 20, fontSize: 11, fontWeight: 700,
          letterSpacing: '0.06em', whiteSpace: 'nowrap',
        }}>
          CURRENT PLAN
        </div>
      )}

      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        {plan.label}
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, margin: '8px 0 4px' }}>
        {plan.price === 0 ? (
          <span style={{ fontSize: 36, fontWeight: 800, color: 'var(--text)' }}>Free</span>
        ) : (
          <>
            <span style={{ fontSize: 36, fontWeight: 800, color: 'var(--text)' }}>${plan.price}</span>
            <span style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 6 }}>/month</span>
          </>
        )}
      </div>

      <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {FEATURES[planKey].map(feat => (
          <li key={feat} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13.5, color: 'var(--text)' }}>
            <CheckIcon />
            {feat}
          </li>
        ))}
      </ul>

      {isAdmin ? (
        <div style={{ marginTop: 'auto', padding: '12px 0', textAlign: 'center', fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>
          ✓ Admin — all features unlocked
        </div>
      ) : isCurrent ? (
        <div style={{ marginTop: 'auto', padding: '12px 0', textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
          Your current plan
        </div>
      ) : planKey === 'free' ? (
        <div style={{ marginTop: 'auto', padding: '12px 0', textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
          {currentPlan !== 'free' ? 'Downgrade via billing portal' : ''}
        </div>
      ) : (
        <button
          className="btn btn-primary"
          style={{ marginTop: 'auto', width: '100%', opacity: loadingPlan === planKey ? 0.7 : 1 }}
          disabled={!!loadingPlan}
          onClick={() => onUpgrade(planKey)}
        >
          {loadingPlan === planKey ? 'Redirecting…' : `Get ${plan.label}`}
        </button>
      )}
    </div>
  )
}

export default function Pricing() {
  const { user } = useAuth()
  const { plan: currentPlan, isAdmin, loading } = usePlan()
  const navigate  = useNavigate()
  const location  = useLocation()
  const [loadingPlan, setLoadingPlan] = useState(null)
  const [error, setError]             = useState('')

  // Did they just upgrade?
  const justUpgraded = new URLSearchParams(location.search).get('upgraded') === 'true'

  const handleUpgrade = async (planKey) => {
    if (isDemoUser(user)) { alert('Demo mode — sign up to subscribe.'); return }
    setLoadingPlan(planKey)
    setError('')

    try {
      const res = await fetch('/.netlify/functions/create-landlord-subscription', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ planId: planKey, userId: user.id, userEmail: user.email }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error || 'Could not start checkout')
      window.location.href = data.url
    } catch (err) {
      setError(err.message)
      setLoadingPlan(null)
    }
  }

  const handleManageBilling = async () => {
    setLoadingPlan('portal')
    try {
      const res = await fetch('/.netlify/functions/landlord-billing-portal', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ userId: user.id }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error || 'Could not open billing portal')
      window.open(data.url, '_blank')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingPlan(null)
    }
  }

  return (
    <Layout>
      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Plans & Billing</h1>
            <p className="page-subtitle">Choose the plan that fits your portfolio</p>
          </div>
          {!isAdmin && currentPlan !== 'free' && (
            <button className="btn btn-outline" onClick={handleManageBilling} disabled={!!loadingPlan}>
              {loadingPlan === 'portal' ? 'Opening…' : 'Manage Billing'}
            </button>
          )}
        </div>

        {justUpgraded && (
          <div className="alert" style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', color: '#1b5e20', marginBottom: 24, borderRadius: 10, padding: '14px 20px' }}>
            🎉 Welcome to {PLANS[currentPlan]?.label}! Your plan has been activated.
          </div>
        )}

        {error && <div className="alert alert-error" style={{ marginBottom: 24 }}>{error}</div>}

        {loading ? (
          <div className="spinner" />
        ) : (
          <>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'stretch' }}>
              {['free', 'pro', 'portfolio'].map(key => (
                <PlanCard
                  key={key}
                  planKey={key}
                  currentPlan={isAdmin ? 'portfolio' : currentPlan}
                  isAdmin={isAdmin && key === 'portfolio'}
                  onUpgrade={handleUpgrade}
                  loadingPlan={loadingPlan}
                />
              ))}
            </div>

            <div className="card" style={{ marginTop: 32, padding: '20px 24px' }}>
              <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
                <strong style={{ color: 'var(--text)' }}>How payments work:</strong> Vestry uses Stripe for all payment processing.
                When tenants pay rent online, a small processing fee (~2.9% + 30¢) is passed to the tenant so you receive the full rent amount.
                Your Vestry subscription is billed separately and can be cancelled anytime from the billing portal.
              </p>
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
