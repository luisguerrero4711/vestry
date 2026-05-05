import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

// ─────────────────────────────────────────────────────────────
// /role-selection
//
// Shown to authenticated users whose profile has no role yet.
// They pick "Landlord" or "Tenant", we update profiles.role,
// then redirect to the dashboard.
// ─────────────────────────────────────────────────────────────

const ROLES = [
  {
    key: 'landlord',
    label: 'I\'m a landlord',
    sub: 'I own or manage rental properties',
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <rect width="36" height="36" rx="10" fill="var(--brand-tint)" />
        <path d="M18 7l11 9H7l11-9z" fill="var(--brand)" />
        <rect x="11" y="16" width="14" height="12" rx="1" fill="var(--brand)" opacity=".25" />
        <rect x="15" y="20" width="6" height="8" rx="1" fill="var(--brand)" />
      </svg>
    ),
  },
  {
    key: 'tenant',
    label: 'I\'m a tenant',
    sub: 'I rent a property from a landlord',
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <rect width="36" height="36" rx="10" fill="var(--green-tint)" />
        <circle cx="18" cy="14" r="5" fill="var(--green)" opacity=".35" />
        <circle cx="18" cy="13" r="4" fill="var(--green)" />
        <path d="M8 28c0-4.418 4.477-8 10-8s10 3.582 10 8" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
]

export default function RoleSelection() {
  const { user }          = useAuth()
  const navigate          = useNavigate()
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const handleSelect = async (role) => {
    if (!user || saving) return
    setSaving(true)
    setError('')

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', user.id)

    if (updateError) {
      setError(updateError.message)
      setSaving(false)
      return
    }

    navigate('/dashboard', { replace: true })
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>

        {/* Logo */}
        <div style={styles.logoWrap}>
          <span style={styles.logo}>Vestry<span style={styles.logoDot} /></span>
        </div>

        <h2 style={styles.heading}>Welcome — how are you using Vestry?</h2>
        <p style={styles.sub}>Pick the role that fits. You can update this later in Settings.</p>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div style={styles.roleGrid}>
          {ROLES.map(({ key, label, sub, icon }) => (
            <button
              key={key}
              onClick={() => handleSelect(key)}
              disabled={saving}
              style={styles.roleBtn(saving)}
            >
              <div style={styles.roleIcon}>{icon}</div>
              <div style={styles.roleLabel}>{label}</div>
              <div style={styles.roleSub}>{sub}</div>
            </button>
          ))}
        </div>

        {saving && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
            <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
          </div>
        )}

        {/* Allow skipping — they can set role later */}
        <button
          onClick={() => navigate('/dashboard', { replace: true })}
          style={styles.skipBtn}
          disabled={saving}
        >
          Skip for now
        </button>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'var(--cream)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    background: 'var(--warm-white)',
    border: '1px solid var(--border)',
    borderRadius: 20,
    padding: '40px 44px',
    width: '100%',
    maxWidth: 460,
    boxShadow: '0 8px 40px rgba(26,23,20,0.08)',
    textAlign: 'center',
  },
  logoWrap: {
    marginBottom: 24,
  },
  logo: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 28,
    fontWeight: 600,
    color: 'var(--nav)',
    display: 'inline-flex',
    alignItems: 'baseline',
    gap: 3,
  },
  logoDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: 'var(--accent)',
    display: 'inline-block',
    marginBottom: 3,
    marginLeft: 2,
    flexShrink: 0,
  },
  heading: {
    fontSize: 20,
    fontWeight: 600,
    color: 'var(--text)',
    marginBottom: 8,
    lineHeight: 1.3,
  },
  sub: {
    fontSize: 13.5,
    color: 'var(--muted)',
    marginBottom: 28,
  },
  roleGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
    marginBottom: 8,
  },
  roleBtn: (disabled) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
    padding: '24px 16px',
    background: disabled ? 'var(--bg-tint)' : 'var(--bg-elev-1)',
    border: '1.5px solid var(--border)',
    borderRadius: 14,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'border-color 0.15s, background 0.15s, box-shadow 0.15s',
    textAlign: 'center',
    fontFamily: "'Geist', sans-serif",
  }),
  roleIcon: {
    lineHeight: 0,
  },
  roleLabel: {
    fontSize: 14.5,
    fontWeight: 600,
    color: 'var(--text)',
  },
  roleSub: {
    fontSize: 12,
    color: 'var(--muted)',
    lineHeight: 1.4,
  },
  skipBtn: {
    marginTop: 20,
    background: 'none',
    border: 'none',
    color: 'var(--muted)',
    fontSize: 13,
    cursor: 'pointer',
    textDecoration: 'underline',
    fontFamily: "'Geist', sans-serif",
    padding: '4px 8px',
  },
}
