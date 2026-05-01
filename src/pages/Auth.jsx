import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Auth() {
  const [mode, setMode]       = useState('signin') // 'signin' | 'signup'
  const [email, setEmail]     = useState('')
  const [password, setPass]   = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')

  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    if (mode === 'signin') {
      const { error } = await signIn(email, password)
      if (error) { setError(error.message); setLoading(false); return }
      navigate('/dashboard')
    } else {
      const { error } = await signUp(email, password)
      if (error) { setError(error.message); setLoading(false); return }
      setSuccess('Account created! Check your email to confirm, then sign in.')
      setMode('signin')
    }
    setLoading(false)
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logoWrap}>
          <span style={styles.logo}>
            Vestry<span style={styles.logoDot} />
          </span>
          <div style={styles.tagline}>Property management for serious landlords.</div>
        </div>

        {/* Tabs */}
        <div style={styles.tabs}>
          {['signin', 'signup'].map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(''); setSuccess('') }}
              style={{ ...styles.tab, ...(mode === m ? styles.tabActive : {}) }}
            >
              {m === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          {error   && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPass(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
            disabled={loading}
          >
            {loading
              ? 'Loading…'
              : mode === 'signin' ? 'Sign in →' : 'Create account →'}
          </button>
        </form>

        <p style={styles.legal}>
          Free for up to 3 units. No credit card required.
        </p>
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
    maxWidth: 420,
    boxShadow: '0 8px 40px rgba(26,23,20,0.08)',
  },
  logoWrap: {
    textAlign: 'center',
    marginBottom: 28,
  },
  logo: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 32,
    fontWeight: 600,
    color: 'var(--nav)',
    display: 'inline-flex',
    alignItems: 'baseline',
    gap: 3,
  },
  logoDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: 'var(--accent)',
    display: 'inline-block',
    marginBottom: 4,
    marginLeft: 2,
    flexShrink: 0,
  },
  tagline: {
    fontSize: 13,
    color: 'var(--muted)',
    marginTop: 6,
  },
  tabs: {
    display: 'flex',
    background: 'var(--cream)',
    borderRadius: 10,
    padding: 3,
    marginBottom: 24,
    gap: 2,
  },
  tab: {
    flex: 1,
    padding: '9px 14px',
    border: 'none',
    borderRadius: 8,
    background: 'transparent',
    color: 'var(--muted)',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
    transition: 'background 0.15s, color 0.15s',
  },
  tabActive: {
    background: 'var(--warm-white)',
    color: 'var(--text)',
    fontWeight: 600,
    boxShadow: '0 1px 4px rgba(26,23,20,0.08)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
  },
  legal: {
    textAlign: 'center',
    fontSize: 11.5,
    color: 'var(--muted)',
    marginTop: 20,
  },
}
