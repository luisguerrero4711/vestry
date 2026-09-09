import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { DEMO_EMAIL, DEMO_PASSWORD } from '../lib/demoData'
import { VIcon } from '../lib/vestry-shared'

const NAVY = 'var(--nav)'
const CLAY = 'var(--accent)'
const CREAM = 'var(--cream)'
const MUTED = 'var(--muted)'
const TEXT = 'var(--text)'

function Wordmark({ light }) {
  return (
    <span style={{ fontFamily: 'var(--font-display)', fontSize: 23, fontWeight: 600, letterSpacing: '-0.02em', color: light ? CREAM : NAVY }}>
      Vestry<span style={{ color: CLAY }}>.</span>
    </span>
  )
}

const btnClay = {
  display: 'inline-flex', alignItems: 'center', gap: 7, padding: '11px 20px',
  background: CLAY, color: '#fff', border: 'none', borderRadius: 999,
  fontFamily: 'var(--font-text)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  textDecoration: 'none', whiteSpace: 'nowrap',
}
const btnGhost = {
  display: 'inline-flex', alignItems: 'center', gap: 7, padding: '11px 20px',
  background: 'transparent', color: NAVY, border: '1.5px solid rgba(27,43,58,0.2)',
  borderRadius: 999, fontFamily: 'var(--font-text)', fontSize: 14, fontWeight: 600,
  cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap',
}

export default function Landing() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)

  const tryDemo = async () => {
    setBusy(true)
    const { error } = await signIn(DEMO_EMAIL, DEMO_PASSWORD)
    if (!error) navigate('/dashboard')
    else setBusy(false)
  }

  const section = { maxWidth: 1080, margin: '0 auto', padding: '0 24px' }

  return (
    <div style={{ minHeight: '100%', overflowY: 'auto', background: CREAM, fontFamily: 'var(--font-text)', color: TEXT }}>
      {/* ── Nav ─────────────────────────────────────────── */}
      <header style={{ borderBottom: '1px solid rgba(27,43,58,0.08)', background: CREAM, position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ ...section, display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 68, gap: 16 }}>
          <Wordmark />
          <nav style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Link to="/auth" style={{ fontSize: 14, fontWeight: 600, color: NAVY, textDecoration: 'none' }}>Sign in</Link>
            <button onClick={tryDemo} disabled={busy} style={{ ...btnClay, opacity: busy ? 0.7 : 1 }}>
              {busy ? 'Opening…' : 'Try the demo'}
            </button>
          </nav>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────── */}
      <div style={{ ...section, paddingTop: 'clamp(40px, 7vw, 88px)', paddingBottom: 'clamp(40px, 6vw, 80px)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'clamp(32px, 5vw, 64px)', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: CLAY, marginBottom: 18 }}>
              For self-managing landlords
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: NAVY, fontSize: 'clamp(34px, 5.4vw, 54px)', lineHeight: 1.08, letterSpacing: '-0.02em', margin: 0 }}>
              Know who&rsquo;s paid, what&rsquo;s broken, and what&rsquo;s coming up.
            </h1>
            <p style={{ fontSize: 'clamp(16px, 2vw, 18px)', lineHeight: 1.65, color: MUTED, margin: '20px 0 28px', maxWidth: 520 }}>
              Vestry is a calm home for your rentals &mdash; whole units, and houses rented one room at a time. No second spreadsheet for the monthly stuff.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button onClick={tryDemo} disabled={busy} style={{ ...btnClay, padding: '13px 24px', fontSize: 15, opacity: busy ? 0.7 : 1 }}>
                {busy ? 'Opening the demo…' : <>Try the live demo <span aria-hidden>&rarr;</span></>}
              </button>
              <Link to="/auth" style={{ ...btnGhost, padding: '13px 24px', fontSize: 15 }}>Sign in</Link>
            </div>
            <p style={{ fontSize: 13, color: MUTED, marginTop: 16 }}>
              No account needed. The demo is a full working portfolio you can click through.
            </p>
          </div>

          {/* Faux product panel */}
          <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 24px 60px rgba(27,43,58,0.12)', border: '1px solid rgba(27,43,58,0.06)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(27,43,58,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: NAVY }}>Rent Roll</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: MUTED }}>4 units &middot; 75% occupied</span>
            </div>
            {[
              ['Oak Street Duplex', 'Unit A', '$1,450', true],
              ['Oak Street Duplex', 'Unit B', '$1,200', true],
              ['Riverside Condo', 'Unit 1', '$1,800', true],
              ['Maple Ave Townhome', 'Unit 1', '$1,650', false],
            ].map(([p, u, rent, occ], i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10, alignItems: 'center', padding: '13px 20px', borderTop: i ? '1px solid rgba(27,43,58,0.06)' : 'none' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: NAVY, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p}</div>
                  <div style={{ fontSize: 12, color: MUTED, fontWeight: 500 }}>{u}</div>
                </div>
                <div style={{ fontFamily: 'var(--font-num)', fontSize: 14, fontWeight: 600, color: NAVY }}>{rent}</div>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 999,
                  fontSize: 11, fontWeight: 600,
                  background: occ ? 'var(--green-tint)' : 'var(--bg-tint)',
                  color: occ ? 'var(--green)' : MUTED,
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: occ ? 'var(--green)' : MUTED }} />
                  {occ ? 'Active' : 'Vacant'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── How landlords rent ──────────────────────────── */}
      <div style={{ background: '#fff', borderTop: '1px solid rgba(27,43,58,0.07)', borderBottom: '1px solid rgba(27,43,58,0.07)' }}>
        <div style={{ ...section, padding: 'clamp(48px, 6vw, 72px) 24px' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: NAVY, fontSize: 'clamp(26px, 3.6vw, 34px)', letterSpacing: '-0.02em', margin: '0 0 8px' }}>
            Built for the way small landlords actually rent
          </h2>
          <p style={{ fontSize: 16, color: MUTED, margin: '0 0 36px', maxWidth: 560 }}>
            Most tools assume every rental is one unit, one lease. Real portfolios are messier than that.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
            {[
              ['House', 'Whole units', 'One lease for the whole place. A single-family home, a condo, one side of a duplex — the simple case, done cleanly.'],
              ['Bed', 'Rooms, one at a time', 'A house rented by the room. Each room gets its own tenant and its own status, all tracked under one roof.'],
              ['Chart', 'One clear picture', 'Occupancy, scheduled rent, and what’s outstanding — from real leases and payments, not a number you typed in once.'],
            ].map(([icon, title, body]) => {
              const Icon = VIcon[icon]
              return (
                <div key={title} style={{ background: CREAM, borderRadius: 14, padding: '24px 22px', border: '1px solid rgba(27,43,58,0.06)' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 11, background: 'var(--tag-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                    <Icon s={20} c={CLAY} />
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: NAVY, marginBottom: 6 }}>{title}</div>
                  <div style={{ fontSize: 14, lineHeight: 1.6, color: MUTED }}>{body}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── What's inside ───────────────────────────────── */}
      <div style={{ ...section, padding: 'clamp(48px, 6vw, 72px) 24px' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: NAVY, fontSize: 'clamp(26px, 3.6vw, 34px)', letterSpacing: '-0.02em', margin: '0 0 36px' }}>
          What&rsquo;s inside today
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
          {[
            ['House', 'Properties & units', 'Every building and unit, with occupancy derived from real leases.'],
            ['Person', 'Rooms & tenants', 'Assign a tenant to a room and see exactly who lives where.'],
            ['Doc', 'Leases', 'Draft, active, and expiring leases — end or renew them without double-charging anyone.'],
            ['Dollar', 'Rent ledger', 'Generate monthly rent, log payments in exact cents, reverse mistakes with a full audit trail.'],
            ['Settings', 'Maintenance', 'Track repairs by unit or room — priority, vendor, cost, and updates, with private notes.'],
          ].map(([icon, title, body]) => {
            const Icon = VIcon[icon]
            return (
              <div key={title} style={{ display: 'flex', gap: 14 }}>
                <div style={{ flexShrink: 0, width: 38, height: 38, borderRadius: 10, background: 'var(--tag-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon s={18} c={CLAY} />
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: NAVY, marginBottom: 3 }}>{title}</div>
                  <div style={{ fontSize: 14, lineHeight: 1.55, color: MUTED }}>{body}</div>
                </div>
              </div>
            )
          })}
        </div>
        <p style={{ fontSize: 13, color: MUTED, marginTop: 28 }}>
          Coming next: a tenant portal and online rent collection.
        </p>
      </div>

      {/* ── Closing CTA ─────────────────────────────────── */}
      <div style={{ background: NAVY }}>
        <div style={{ ...section, padding: 'clamp(48px, 6vw, 72px) 24px', textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: CREAM, fontSize: 'clamp(26px, 3.8vw, 36px)', letterSpacing: '-0.02em', margin: '0 0 12px' }}>
            See it with real data
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.72)', margin: '0 auto 28px', maxWidth: 460 }}>
            The demo has three properties, four units, and a house rented by the room. Click around &mdash; nothing you do sticks.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={tryDemo} disabled={busy} style={{ ...btnClay, padding: '13px 26px', fontSize: 15, opacity: busy ? 0.7 : 1 }}>
              {busy ? 'Opening the demo…' : <>Try the demo <span aria-hidden>&rarr;</span></>}
            </button>
            <Link to="/auth" style={{ ...btnGhost, padding: '13px 26px', fontSize: 15, color: CREAM, borderColor: 'rgba(255,255,255,0.28)' }}>Sign in</Link>
          </div>
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer style={{ background: CREAM }}>
        <div style={{ ...section, padding: '28px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <Wordmark />
          <div style={{ display: 'flex', gap: 18, fontSize: 13, fontWeight: 600 }}>
            <button onClick={tryDemo} style={{ background: 'none', border: 'none', color: NAVY, fontWeight: 600, fontSize: 13, cursor: 'pointer', padding: 0, fontFamily: 'var(--font-text)' }}>Demo</button>
            <Link to="/auth" style={{ color: NAVY, textDecoration: 'none' }}>Sign in</Link>
          </div>
          <div style={{ fontSize: 12, color: MUTED }}>&copy; {new Date().getFullYear()} Vestry</div>
        </div>
      </footer>
    </div>
  )
}
