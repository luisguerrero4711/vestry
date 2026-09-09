import { Link } from 'react-router-dom'
import { usePlan } from '../hooks/usePlan'
import { VT, VIcon } from '../lib/vestry-shared'

/**
 * Renders `children` when the current plan includes `feature`
 * (see PLANS in usePlan.js — e.g. "stripePayments", "reminders").
 * Otherwise shows a small locked "Upgrade" affordance.
 * props: feature, children, compact
 */
export default function UpgradeGate({ feature, children, compact = false }) {
  const { can, loading } = usePlan()
  if (loading) return null
  if (can(feature)) return children

  return (
    <Link
      to="/pricing"
      title="Upgrade to unlock"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: compact ? '4px 8px' : '6px 12px',
        background: VT.amberTint, color: VT.amber,
        borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: 'none',
      }}
    >
      <VIcon.Lock s={12} c="var(--amber)" /> {compact ? 'Pro' : 'Upgrade'}
    </Link>
  )
}
