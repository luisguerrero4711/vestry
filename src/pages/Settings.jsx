import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { isDemoUser } from '../lib/demoData'
import Layout from '../components/Layout'
import { VT, VIcon, VSection } from '../lib/vestry-shared'

const inputStyle = {
  width: '100%', padding: '10px 13px',
  border: `1.5px solid ${VT.line}`, borderRadius: 10,
  background: VT.card, color: VT.text1,
  fontFamily: VT.fontText, fontSize: 13, fontWeight: 500,
  outline: 'none', transition: 'border-color 0.2s',
}

const labelStyle = {
  fontSize: 11, fontWeight: 600, color: VT.text3,
  textTransform: 'uppercase', letterSpacing: '0.05em',
  marginBottom: 5, display: 'block',
}

function Toast({ msg, type }) {
  if (!msg) return null
  const colors = type === 'success'
    ? { bg: 'var(--green-tint)', border: 'var(--green)', color: 'var(--green)' }
    : { bg: 'var(--red-tint)', border: 'var(--red)', color: 'var(--red)' }
  return (
    <div style={{
      background: colors.bg, border: `1px solid ${colors.border}`,
      borderRadius: 10, padding: '10px 14px',
      fontSize: 13, fontWeight: 500, color: colors.color, marginBottom: 12,
    }}>{msg}</div>
  )
}

export default function Settings() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const demo = isDemoUser(user)

  // Email
  const [emailForm, setEmailForm] = useState({ email: user?.email || '', confirmEmail: '' })
  const [emailMsg, setEmailMsg] = useState({ msg: '', type: '' })
  const [emailSaving, setEmailSaving] = useState(false)

  // Password
  const [pwForm, setPwForm] = useState({ password: '', confirmPassword: '' })
  const [pwMsg, setPwMsg] = useState({ msg: '', type: '' })
  const [pwSaving, setPwSaving] = useState(false)

  const handleEmailSave = async e => {
    e.preventDefault()
    if (!emailForm.email || !/\S+@\S+\.\S+/.test(emailForm.email)) {
      setEmailMsg({ msg: 'Please enter a valid email.', type: 'error' }); return
    }
    if (emailForm.email !== emailForm.confirmEmail) {
      setEmailMsg({ msg: 'Emails do not match.', type: 'error' }); return
    }
    if (emailForm.email === user?.email) {
      setEmailMsg({ msg: 'That is already your current email.', type: 'error' }); return
    }
    setEmailSaving(true)
    setEmailMsg({ msg: '', type: '' })
    const { error } = await supabase.auth.updateUser({ email: emailForm.email })
    setEmailSaving(false)
    if (error) {
      setEmailMsg({ msg: error.message, type: 'error' })
    } else {
      setEmailMsg({ msg: 'Check your new email inbox to confirm the change.', type: 'success' })
      setEmailForm(f => ({ ...f, confirmEmail: '' }))
    }
  }

  const handlePasswordSave = async e => {
    e.preventDefault()
    if (pwForm.password.length < 8) {
      setPwMsg({ msg: 'Password must be at least 8 characters.', type: 'error' }); return
    }
    if (pwForm.password !== pwForm.confirmPassword) {
      setPwMsg({ msg: 'Passwords do not match.', type: 'error' }); return
    }
    setPwSaving(true)
    setPwMsg({ msg: '', type: '' })
    const { error } = await supabase.auth.updateUser({ password: pwForm.password })
    setPwSaving(false)
    if (error) {
      setPwMsg({ msg: error.message, type: 'error' })
    } else {
      setPwMsg({ msg: 'Password updated successfully.', type: 'success' })
      setPwForm({ password: '', confirmPassword: '' })
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <Layout>
      <div className="v-page">
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, color: VT.text3, fontWeight: 500, marginBottom: 4 }}>Account</div>
          <h1 style={{ fontFamily: VT.fontDisplay, fontSize: 30, fontWeight: 600, margin: 0, letterSpacing: '-0.03em', lineHeight: 1.1 }}>Settings</h1>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 540 }}>

          {/* Account info card */}
          <div style={{ background: VT.card, borderRadius: 'var(--r-md)', boxShadow: VT.shadowCard, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 16,
                background: 'var(--brand-tint)', border: `2px solid var(--brand)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: VT.fontDisplay, fontSize: 18, fontWeight: 700, color: 'var(--brand)',
              }}>
                {user?.email?.[0]?.toUpperCase() ?? 'U'}
              </div>
              <div>
                <div style={{ fontFamily: VT.fontDisplay, fontSize: 15, fontWeight: 600, letterSpacing: '-0.02em' }}>
                  {user?.email}
                </div>
                <div style={{ fontSize: 12, color: VT.text3, fontWeight: 500, marginTop: 2 }}>
                  {demo ? 'Demo account' : 'Account owner'}
                </div>
              </div>
            </div>
          </div>

          {demo ? (
            /* Demo user — can't change auth */
            <div style={{ background: VT.card, borderRadius: 'var(--r-md)', boxShadow: VT.shadowCard, padding: 24 }}>
              <div style={{
                background: 'var(--brand-tint)', border: `1px solid var(--brand)22`,
                borderRadius: 10, padding: '14px 16px',
              }}>
                <div style={{ fontFamily: VT.fontDisplay, fontSize: 14, fontWeight: 600, color: 'var(--brand)', marginBottom: 4 }}>
                  You're in demo mode
                </div>
                <div style={{ fontSize: 13, color: VT.text2, fontWeight: 500, lineHeight: 1.5 }}>
                  Email and password changes are disabled on the demo account. Sign up for your own account to manage settings.
                </div>
                <button
                  onClick={() => navigate('/auth')}
                  style={{
                    marginTop: 12, padding: '8px 16px', background: 'var(--brand)', border: 'none',
                    borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer',
                  }}
                >Create your account →</button>
              </div>
            </div>
          ) : (
            <>
              {/* Change email */}
              <div style={{ background: VT.card, borderRadius: 'var(--r-md)', boxShadow: VT.shadowCard, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: `1px solid ${VT.line}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <VIcon.Mail s={15} c={VT.text2} />
                  <span style={{ fontFamily: VT.fontDisplay, fontSize: 14, fontWeight: 600, letterSpacing: '-0.02em' }}>Change email</span>
                </div>
                <form onSubmit={handleEmailSave} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <Toast {...emailMsg} />
                  <div>
                    <label style={labelStyle}>New email</label>
                    <input
                      style={inputStyle} type="email"
                      value={emailForm.email}
                      onChange={e => setEmailForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="you@example.com"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Confirm new email</label>
                    <input
                      style={inputStyle} type="email"
                      value={emailForm.confirmEmail}
                      onChange={e => setEmailForm(f => ({ ...f, confirmEmail: e.target.value }))}
                      placeholder="Same email again"
                    />
                  </div>
                  <button type="submit" disabled={emailSaving} style={{
                    padding: '9px 16px', background: 'var(--brand)', border: 'none',
                    borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer',
                    opacity: emailSaving ? 0.6 : 1, alignSelf: 'flex-start',
                  }}>{emailSaving ? 'Saving…' : 'Update email'}</button>
                </form>
              </div>

              {/* Change password */}
              <div style={{ background: VT.card, borderRadius: 'var(--r-md)', boxShadow: VT.shadowCard, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: `1px solid ${VT.line}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <VIcon.Lock s={15} c={VT.text2} />
                  <span style={{ fontFamily: VT.fontDisplay, fontSize: 14, fontWeight: 600, letterSpacing: '-0.02em' }}>Change password</span>
                </div>
                <form onSubmit={handlePasswordSave} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <Toast {...pwMsg} />
                  <div>
                    <label style={labelStyle}>New password</label>
                    <input
                      style={inputStyle} type="password"
                      value={pwForm.password}
                      onChange={e => setPwForm(f => ({ ...f, password: e.target.value }))}
                      placeholder="Min 8 characters"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Confirm new password</label>
                    <input
                      style={inputStyle} type="password"
                      value={pwForm.confirmPassword}
                      onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))}
                      placeholder="Same password again"
                    />
                  </div>
                  <button type="submit" disabled={pwSaving} style={{
                    padding: '9px 16px', background: 'var(--brand)', border: 'none',
                    borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer',
                    opacity: pwSaving ? 0.6 : 1, alignSelf: 'flex-start',
                  }}>{pwSaving ? 'Saving…' : 'Update password'}</button>
                </form>
              </div>
            </>
          )}

          {/* Sign out */}
          <div style={{ background: VT.card, borderRadius: 'var(--r-md)', boxShadow: VT.shadowCard, padding: 20 }}>
            <div style={{ fontFamily: VT.fontDisplay, fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Sign out</div>
            <div style={{ fontSize: 13, color: VT.text2, fontWeight: 500, marginBottom: 14 }}>
              You'll be returned to the login screen.
            </div>
            <button
              onClick={handleSignOut}
              style={{
                padding: '9px 16px', background: 'var(--red-tint)', border: `1px solid var(--red)44`,
                borderRadius: 10, fontSize: 13, fontWeight: 600, color: 'var(--red)', cursor: 'pointer',
              }}
            >Sign out of Vestry</button>
          </div>
        </div>
      </div>
    </Layout>
  )
}
