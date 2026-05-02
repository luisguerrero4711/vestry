import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { isDemoUser } from '../lib/demoData'

// ── Plan limits ─────────────────────────────────────────────
export const PLANS = {
  free: {
    label:        'Free',
    maxProperties: 1,
    stripePayments: false,
    reminders:    false,
    price:        0,
  },
  pro: {
    label:        'Pro',
    maxProperties: 5,
    stripePayments: true,
    reminders:    true,
    price:        29,
  },
  portfolio: {
    label:        'Portfolio',
    maxProperties: Infinity,
    stripePayments: true,
    reminders:    true,
    price:        79,
  },
}

// Demo users get Pro limits (so they can see all features)
const DEMO_PROFILE = { plan: 'pro', is_admin: false }

// ── Hook ────────────────────────────────────────────────────
export function usePlan() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }

    if (isDemoUser(user)) {
      setProfile(DEMO_PROFILE)
      setLoading(false)
      return
    }

    supabase
      .from('profiles')
      .select('plan, is_admin, stripe_customer_id, stripe_subscription_id')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setProfile(data ?? { plan: 'free', is_admin: false })
        setLoading(false)
      })
  }, [user])

  // Admins always get portfolio-level access
  const effectivePlan = profile?.is_admin ? 'portfolio' : (profile?.plan ?? 'free')
  const limits        = PLANS[effectivePlan] ?? PLANS.free

  /** True if the user's plan supports this feature */
  const can = (feature) => !!limits[feature]

  /** True if user can add another property given their current count */
  const canAddProperty = (currentCount) => currentCount < limits.maxProperties

  return {
    plan:        effectivePlan,
    limits,
    isAdmin:     profile?.is_admin ?? false,
    profile,
    loading,
    can,
    canAddProperty,
  }
}
