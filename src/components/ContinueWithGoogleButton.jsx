import { useState } from 'react'
import { supabase } from '../lib/supabase'

// Google "G" logo SVG (official brand colors)
function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/>
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/>
    </svg>
  )
}

export default function ContinueWithGoogleButton({ style }) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const handleClick = async () => {
    setLoading(true)
    setError('')

    // Fall back to window.location.origin so it works without VITE_SITE_URL locally
    const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${siteUrl}/auth/callback`,
      },
    })

    if (oauthError) {
      setError(oauthError.message)
      setLoading(false)
    }
    // On success the browser navigates to Google — no need to reset loading
  }

  return (
    <div style={style}>
      {error && (
        <div className="alert alert-error" style={{ marginBottom: 10 }}>
          {error}
        </div>
      )}
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        style={btnStyle(loading)}
      >
        {loading ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
            <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
            Redirecting to Google…
          </span>
        ) : (
          <span style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
            <GoogleLogo />
            Continue with Google
          </span>
        )}
      </button>
    </div>
  )
}

const btnStyle = (loading) => ({
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  padding: '11px 18px',
  background: loading ? 'var(--bg-tint)' : 'var(--bg-elev-1)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 500,
  fontFamily: "'Geist', sans-serif",
  color: loading ? 'var(--text-muted)' : 'var(--text)',
  cursor: loading ? 'not-allowed' : 'pointer',
  transition: 'background 0.15s, border-color 0.15s',
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
})
