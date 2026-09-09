import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { usePlan, PLANS } from '../hooks/usePlan'
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  FileText,
  Wrench,
  Receipt,
  BarChart2,
  Table2,
  Zap,
  LogOut,
  X,
  Settings,
} from 'lucide-react'

const NAV = [
  {
    label: 'Main',
    items: [
      { to: '/dashboard',  Icon: LayoutDashboard, label: 'Dashboard'  },
      { to: '/properties', Icon: Building2,        label: 'Properties' },
      { to: '/tenants',    Icon: Users,            label: 'Tenants'    },
      { to: '/payments',   Icon: CreditCard,       label: 'Payments'   },
    ],
  },
  {
    label: 'Finance',
    items: [
      { to: '/leases',      Icon: FileText,  label: 'Leases'      },
      { to: '/rent-roll',   Icon: Table2,    label: 'Rent Roll'   },
      { to: '/maintenance', Icon: Wrench,    label: 'Maintenance' },
      { to: '/expenses',    Icon: Receipt,   label: 'Expenses'    },
      { to: '/reports',     Icon: BarChart2, label: 'Reports'     },
    ],
  },
  {
    label: 'Account',
    items: [
      { to: '/settings', Icon: Settings, label: 'Settings' },
    ],
  },
]

const PLAN_COLORS = {
  free:      { bg: '#f3f4f6', color: '#6b7280' },
  pro:       { bg: '#fef3c7', color: '#92400e' },
  portfolio: { bg: '#d1fae5', color: '#065f46' },
}

export default function Sidebar({ isOpen, onClose }) {
  const { user, signOut } = useAuth()
  const { plan, isAdmin, loading: planLoading } = usePlan()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const planColors = PLAN_COLORS[plan] ?? PLAN_COLORS.free
  const planLabel  = isAdmin ? 'Admin' : (PLANS[plan]?.label ?? 'Free')

  return (
    <>
      {/* Backdrop — only visible on mobile when drawer is open */}
      {isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar${isOpen ? ' sidebar-open' : ''}`}>
        {/* Logo row */}
        <div className="sidebar-logo-wrap">
          <span className="sidebar-logo">
            Vestry<span className="sidebar-logo-dot" />
          </span>
          <button
            className="sidebar-close-btn"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Nav sections */}
        {NAV.map(section => (
          <div key={section.label} className="sidebar-nav-section">
            <div className="sidebar-section-label">{section.label}</div>
            {section.items.map(({ to, Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `sidebar-nav-item${isActive ? ' active' : ''}`
                }
              >
                <Icon size={16} strokeWidth={1.8} className="sidebar-nav-icon" />
                {label}
              </NavLink>
            ))}
          </div>
        ))}

        {/* Admin link */}
        {!planLoading && isAdmin && (
          <div className="sidebar-nav-section" style={{ paddingTop: 4 }}>
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `sidebar-nav-item${isActive ? ' active' : ''}`
              }
              style={{ background: 'rgba(192,97,74,0.08)', color: 'var(--accent)' }}
            >
              <Zap size={16} strokeWidth={1.8} className="sidebar-nav-icon" />
              Admin
            </NavLink>
          </div>
        )}

        {/* Upgrade / billing */}
        {!planLoading && (
          <div className="sidebar-upgrade-wrap">
            {plan !== 'portfolio' && !isAdmin ? (
              <NavLink to="/pricing" className="sidebar-upgrade-btn">
                ✦ Upgrade plan
              </NavLink>
            ) : (
              <NavLink
                to="/pricing"
                className={({ isActive }) =>
                  `sidebar-nav-item${isActive ? ' active' : ''}`
                }
              >
                <BarChart2 size={16} strokeWidth={1.8} className="sidebar-nav-icon" />
                Billing
              </NavLink>
            )}
          </div>
        )}

        {/* User footer */}
        <div className="sidebar-footer">
          <div className="sidebar-user-row">
            <div className="sidebar-avatar">
              {user?.email?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-email">{user?.email}</div>
              {!planLoading && (
                <span
                  className="sidebar-plan-badge"
                  style={{ background: planColors.bg, color: planColors.color }}
                >
                  {planLabel}
                </span>
              )}
            </div>
          </div>
          <button onClick={handleSignOut} className="sidebar-signout-btn">
            <LogOut size={13} strokeWidth={1.8} />
            Sign out
          </button>
        </div>
      </aside>
    </>
  )
}
