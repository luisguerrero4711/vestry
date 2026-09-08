import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { routeAfterAuth } from '../lib/postAuthRoute'

// ─────────────────────────────────────────────────────────────
// /auth/callback
//
// Supabase redirects here after Google OAuth (or any OAuth flow).
// The @supabase/supabase-js client auto-exchanges the code in the
// URL for a session. We then:
//   1. Wait for the session to be available
//   2. Upsert the profile row (email / full_name / avatar_url)
//   3. Grant admin if email matches VITE_MASTER_ADMIN_EMAIL
//   4. Redirect based on role
// ─────────────────────────────────────────────────────────────

export default function AuthCallback() {
  const navigate      = useNavigate()
  const [error, setError] = useState('')
  const handled       = useRef(false)   // prevent double-execution

  useEffect(() => {
    const handleSession = async (session) => {
      if (!session || handled.current) return
      handled.current = true

      const user             = session.user
      const masterAdminEmail = import.meta.env.VITE_MASTER_ADMIN_EMAIL
      const isAdmin          = masterAdminEmail &&
                               user.email?.toLowerCase() === masterAdminEmail.toLowerCase()

      // ── Build profile fields from Google metadata ──────────
      const profileFields = {
        email:      user.email ?? null,
        full_name:  user.user_metadata?.full_name
                    || user.user_metadata?.name
                    || null,
        avatar_url: user.user_metadata?.avatar_url || null,
        updated_at: new Date().toISOString(),
      }

      if (isAdmin) {
        profileFields.is_admin = true
        profileFields.role     = 'admin'
        profileFields.plan     = 'portfolio'
      }

      // ── Upsert profile ─────────────────────────────────────
      // The database trigger auto-creates a row on auth.users insert,
      // but it only sets `id`. We upsert to fill in name/email/avatar.
      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert(
          { id: user.id, ...profileFields },
          { onConflict: 'id', ignoreDuplicates: false }
        )

      if (upsertError) {
        // Non-fatal — user is signed in, just log it
        console.error('Profile upsert failed:', upsertError.message)
      }

      // ── Redirect based on role (shared with email/password sign-in) ──
      await routeAfterAuth(navigate)
    }

    // ── Listen for the SIGNED_IN event (PKCE flow fires this) ─
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          handleSession(session)
        }
      }
    )

    // ── Also check if session is already present (implicit flow) ─
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) handleSession(session)
    })

    return () => subscription.unsubscribe()
  }, [navigate])

  // ── Render ─────────────────────────────────────────────────
  if (error) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.logoWrap}>
            <span style={styles.logo}>Vestry<span style={styles.logoDot} /></span>
          </div>
          <div className="alert alert-error" style={{ marginBottom: 20 }}>
            {error}
          </div>
          <p style={styles.sub}>
            Something went wrong during sign-in.
          </p>
          <a href="/auth" style={styles.backLink}>← Back to sign-in</a>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logoWrap}>
          <span style={styles.logo}>Vestry<span style={styles.logoDot} /></span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <span className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
        </div>
        <p style={styles.sub}>Signing you in…</p>
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
    maxWidth: 380,
    boxShadow: '0 8px 40px rgba(26,23,20,0.08)',
    textAlign: 'center',
  },
  logoWrap: {
    marginBottom: 28,
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
  sub: {
    fontSize: 14,
    color: 'var(--muted)',
    marginTop: 4,
  },
  backLink: {
    display: 'inline-block',
    marginTop: 16,
    fontSize: 13,
    color: 'var(--accent)',
    textDecoration: 'none',
    fontWeight: 500,
  },
}
