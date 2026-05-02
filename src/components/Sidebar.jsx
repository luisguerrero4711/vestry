import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { usePlan, PLANS } from '../hooks/usePlan'

const NAV = [
  {
    label: 'Main',
    items: [
      { to: '/dashboard',   icon: '📊', label: 'Dashboard'  },
      { to: '/properties',  icon: '🏠', label: 'Properties' },
      { to: '/tenants',     icon: '👤', label: 'Tenants'    },
      { to: '/payments',    icon: '💳', label: 'Payments'   },
    ],
  },
  {
    label: 'Finance',
    items: [
      { to: '/leases',   icon: '📄', label: 'Leases'   },
      { to: '/expenses', icon: '🔧', label: 'Expenses' },
      { to: '/reports',  icon: '📈', label: 'Reports'  },
    ],
  },
]

const PLAN_COLORS = {
  free:      { bg: '#f3f4f6', color: '#6b7280' },
  pro:       { bg: '#fef3c7', color: '#92400e' },
  portfolio: { bg: '#d1fae5', color: '#065f46' },
}

export default function Sidebar() {
  const { user, signOut } = useAuth()
  const { plan, isAdmin, loading: planLoading } = usePlan()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/auth')
  }

  const planColors = PLAN_COLORS[plan] ?? PLAN_COLORS.free
  const planLabel  = isAdmin ? 'Admin' : (PLANS[plan]?.label ?? 'Free')

  return (
    <aside style={styles.sidebar}>
      {/* Logo */}
      <div style={styles.logoWrap}>
        <span style={styles.logo}>
          Vestry<span style={styles.logoDot} />
        </span>
      </div>

      {/* Nav sections */}
      {NAV.map(section => (
        <div key={section.label} style={styles.section}>
          <div style={styles.sectionLabel}>{section.label}</div>
          {section.items.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                ...styles.navItem,
                ...(isActive ? styles.navItemActive : {}),
              })}
            >
              <span style={styles.icon}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </div>
      ))}

      {/* Upgrade / plan section */}
      {!planLoading && (
        <div style={{ padding: '12px 14px' }}>
          {plan !== 'portfolio' && !isAdmin ? (
            <NavLink
              to="/pricing"
              style={({ isActive }) => ({
                ...styles.upgradeBtn,
                ...(isActive ? { background: 'var(--accent)', color: '#fff', border: 'none' } : {}),
              })}
            >
              ✦ Upgrade plan
            </NavLink>
          ) : (
            <NavLink
              to="/pricing"
              style={({ isActive }) => ({
                ...styles.navItem,
                ...(isActive ? styles.navItemActive : {}),
              })}
            >
              <span style={styles.icon}>⚙️</span>
              Billing
            </NavLink>
          )}
        </div>
      )}

      {/* User footer */}
      <div style={styles.footer}>
        <div style={styles.userRow}>
          <div style={styles.avatar}>
            {user?.email?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div style={styles.userInfo}>
            <div style={styles.userEmail}>{user?.email}</div>
            {!planLoading && (
              <div style={{
                fontSize: 10, fontWeight: 700, marginTop: 2,
                background: planColors.bg, color: planColors.color,
                padding: '1px 6px', borderRadius: 4,
                display: 'inline-block', letterSpacing: '0.05em', textTransform: 'uppercase',
              }}>
                {planLabel}
              </div>
            )}
          </div>
        </div>
        <button onClick={handleSignOut} style={styles.signOutBtn}>
          Sign out
        </button>
      </div>
    </aside>
  )
}

const styles = {
  sidebar: {
    width: 220,
    minWidth: 220,
    background: 'var(--sidebar)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    position: 'sticky',
    top: 0,
    overflowY: 'auto',
  },
  logoWrap: {
    padding: '22px 20px 18px',
    borderBottom: '1px solid var(--border)',
  },
  logo: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 22,
    fontWeight: 600,
    color: 'var(--nav)',
    letterSpacing: '0.02em',
    display: 'flex',
    alignItems: 'baseline',
    gap: 3,
  },
  logoDot: {
    width: 5,
    height: 5,
    borderRadius: '50%',
    background: 'var(--accent)',
    display: 'inline-block',
    marginBottom: 3,
    marginLeft: 1,
    flexShrink: 0,
  },
  section: {
    padding: '18px 12px 4px',
  },
  sectionLabel: {
    fontSize: 9.5,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    color: 'var(--muted)',
    padding: '0 8px',
    marginBottom: 6,
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    padding: '9px 10px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--muted)',
    textDecoration: 'none',
    marginBottom: 2,
    transition: 'background 0.15s, color 0.15s',
  },
  navItemActive: {
    background: 'var(--active-bg)',
    color: 'var(--active-fg)',
    fontWeight: 600,
  },
  icon: {
    fontSize: 15,
    lineHeight: 1,
    flexShrink: 0,
  },
  upgradeBtn: {
    display: 'block',
    textAlign: 'center',
    padding: '9px 12px',
    borderRadius: 8,
    fontSize: 12.5,
    fontWeight: 700,
    color: 'var(--accent)',
    textDecoration: 'none',
    border: '1.5px dashed var(--accent)',
    letterSpacing: '0.02em',
    transition: 'background 0.15s, color 0.15s',
  },
  footer: {
    marginTop: 'auto',
    borderTop: '1px solid var(--border)',
    padding: '14px 16px',
  },
  userRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: 'var(--nav)',
    color: 'var(--cream)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Outfit', sans-serif",
    fontSize: 13,
    fontWeight: 600,
    flexShrink: 0,
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  userEmail: {
    fontSize: 11.5,
    color: 'var(--muted)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  signOutBtn: {
    width: '100%',
    padding: '7px 12px',
    borderRadius: 8,
    background: 'transparent',
    border: '1px solid var(--border)',
    color: 'var(--muted)',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
    transition: 'background 0.15s, color 0.15s',
  },
}
