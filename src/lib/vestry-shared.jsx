// Vestry shared primitives — icons, pill, avatar, section, property thumb
// All use CSS custom properties from hifi tokens

export const VT = {
  page:       'var(--bg-page)',
  card:       'var(--bg-elev-1)',
  elev2:      'var(--bg-elev-2)',
  tint:       'var(--bg-tint)',
  text1:      'var(--text-1)',
  text2:      'var(--text-2)',
  text3:      'var(--text-3)',
  line:       'var(--line)',
  lineStrong: 'var(--line-strong)',
  brand:      'var(--brand)',
  brandTint:  'var(--brand-tint)',
  green:      'var(--green)',   greenTint:  'var(--green-tint)',
  amber:      'var(--amber)',   amberTint:  'var(--amber-tint)',
  red:        'var(--red)',     redTint:    'var(--red-tint)',
  fontDisplay:'var(--font-display)',
  fontText:   'var(--font-text)',
  fontMono:   'var(--font-mono)',
  fontNum:    'var(--font-num)',
  shadowCard: 'var(--shadow-card)',
  shadowMd:   'var(--shadow-md)',
  shadowLg:   'var(--shadow-lg)',
}

export const VIcon = {
  House: ({ s = 20, c = 'currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11.5L12 4l9 7.5V20a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1v-8.5z" />
    </svg>
  ),
  Person: ({ s = 20, c = 'currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3.5" /><path d="M5 21c0-3.5 3-6 7-6s7 2.5 7 6" />
    </svg>
  ),
  Doc: ({ s = 20, c = 'currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 3h7l5 5v12a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z" />
      <path d="M14 3v5h5M9 13h7M9 17h5" />
    </svg>
  ),
  Dollar: ({ s = 20, c = 'currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 8c0-2-2-3-4-3s-4 1-4 3 2 3 4 3 4 1 4 3-2 3-4 3-4-1-4-3" />
      <path d="M12 3v18" />
    </svg>
  ),
  Chart: ({ s = 20, c = 'currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  ),
  Search: ({ s = 18, c = 'currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="6" /><path d="m20 20-3.5-3.5" />
    </svg>
  ),
  Bell: ({ s = 18, c = 'currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 16V10a6 6 0 0112 0v6l1.5 2.5h-15L6 16zM10 21a2 2 0 004 0" />
    </svg>
  ),
  Plus: ({ s = 18, c = 'currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  Chevron: ({ s = 16, c = 'currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 6 6 6-6 6" />
    </svg>
  ),
  ChevronLeft: ({ s = 16, c = 'currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 6-6 6 6 6" />
    </svg>
  ),
  Up: ({ s = 14, c = 'currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 14 6-6 6 6" />
    </svg>
  ),
  Settings: ({ s = 18, c = 'currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3h0a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8v0a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" />
    </svg>
  ),
  Phone: ({ s = 16, c = 'currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z"/>
    </svg>
  ),
  Mail: ({ s = 16, c = 'currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>
    </svg>
  ),
  MapPin: ({ s = 16, c = 'currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s7-7 7-13a7 7 0 10-14 0c0 6 7 13 7 13z"/><circle cx="12" cy="9" r="2.5"/>
    </svg>
  ),
  Calendar: ({ s = 16, c = 'currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>
    </svg>
  ),
  Filter: ({ s = 16, c = 'currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 5h18l-7 9v6l-4-2v-4z"/>
    </svg>
  ),
  Download: ({ s = 16, c = 'currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4v12m0 0-4-4m4 4 4-4M4 20h16"/>
    </svg>
  ),
  More: ({ s = 18, c = 'currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={c}>
      <circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/>
    </svg>
  ),
  Check: ({ s = 16, c = 'currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 12 5 5L20 7"/>
    </svg>
  ),
  Sparkle: ({ s = 16, c = 'currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={c}>
      <path d="M12 2l1.8 5.5L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.5L12 2z"/>
    </svg>
  ),
  Bed: ({ s = 16, c = 'currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 18V8m0 6h18v4M21 14v-3a3 3 0 00-3-3H10v6"/><circle cx="6.5" cy="11" r="1.5"/>
    </svg>
  ),
  Bath: ({ s = 16, c = 'currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12h16v3a4 4 0 01-4 4H8a4 4 0 01-4-4v-3z"/>
      <path d="M6 12V6a2 2 0 014 0M3 12h18M7 19l-1 2M17 19l1 2"/>
    </svg>
  ),
  Sqft: ({ s = 16, c = 'currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="1"/>
      <path d="M9 4v3M15 4v3M9 17v3M15 17v3M4 9h3M17 9h3M4 15h3M17 15h3"/>
    </svg>
  ),
  X: ({ s = 16, c = 'currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round">
      <path d="m6 6 12 12M6 18 18 6"/>
    </svg>
  ),
  Lock: ({ s = 16, c = 'currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>
    </svg>
  ),
  User: ({ s = 16, c = 'currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3.5"/><path d="M5 21c0-3.5 3-6 7-6s7 2.5 7 6"/>
    </svg>
  ),
}

export function VPill({ children, tone = 'neutral' }) {
  const tones = {
    neutral: { bg: 'var(--bg-tint)',    fg: 'var(--text-2)' },
    success: { bg: 'var(--green-tint)', fg: 'var(--green)'  },
    warn:    { bg: 'var(--amber-tint)', fg: 'var(--amber)'  },
    danger:  { bg: 'var(--red-tint)',   fg: 'var(--red)'    },
    brand:   { bg: 'var(--brand-tint)', fg: 'var(--brand)'  },
  }
  const t = tones[tone] || tones.neutral
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 8px', borderRadius: 999,
      background: t.bg, color: t.fg,
      fontFamily: 'var(--font-text)', fontSize: 11, fontWeight: 600,
      letterSpacing: '-0.005em', whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: t.fg, flexShrink: 0 }} />
      {children}
    </span>
  )
}

export function VAvatar({ initials = '?', size = 32, color }) {
  const palette = ['#FF6B6B','#4ECDC4','#FFD93D','#A78BFA','#60A5FA','#34D399','#F472B6','#FB923C']
  const idx = ((initials.charCodeAt(0) || 0) + (initials.charCodeAt(1) || 0)) % palette.length
  const bg = color || palette[idx]
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: bg, color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-text)', fontSize: size * 0.38, fontWeight: 600,
      letterSpacing: '-0.02em', flexShrink: 0,
    }}>{initials}</div>
  )
}

export function VSection({ title, subtitle, action, children, padding = 22 }) {
  return (
    <div style={{
      background: 'var(--bg-elev-1)', borderRadius: 'var(--r-md)',
      boxShadow: 'var(--shadow-card)', overflow: 'hidden',
    }}>
      {(title || action) && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 20px', borderBottom: '1px solid var(--line)',
        }}>
          <div>
            {title && (
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600,
                letterSpacing: '-0.02em', color: 'var(--text-1)',
              }}>{title}</div>
            )}
            {subtitle && (
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2, fontWeight: 500 }}>{subtitle}</div>
            )}
          </div>
          {action}
        </div>
      )}
      <div style={{ padding }}>{children}</div>
    </div>
  )
}

export function PropertyThumb({ kind = 'duplex', label }) {
  const palettes = {
    duplex:   ['#FFB088', '#FF6B6B', '#7C3AED'],
    condo:    ['#7DD3FC', '#0EA5E9', '#1E40AF'],
    townhome: ['#FDE68A', '#F59E0B', '#7C2D12'],
  }
  const p = palettes[kind] || palettes.duplex
  return (
    <div style={{
      position: 'relative', width: '100%', aspectRatio: '16/10',
      borderRadius: 'var(--r-md)', overflow: 'hidden',
      background: `linear-gradient(160deg, ${p[0]} 0%, ${p[1]} 60%, ${p[2]} 110%)`,
    }}>
      <svg viewBox="0 0 200 125" width="100%" height="100%"
        style={{ position: 'absolute', inset: 0, display: 'block' }}
        preserveAspectRatio="xMidYMid slice">
        <circle cx="160" cy="22" r="14" fill="rgba(255,255,255,0.35)" />
        {kind === 'duplex' && (
          <g>
            <path d="M10 95 L10 60 L40 60 L40 50 L70 50 L70 60 L100 60 L100 95 Z" fill="rgba(255,255,255,0.92)"/>
            <rect x="20" y="70" width="10" height="10" fill={p[2]} opacity="0.4"/>
            <rect x="40" y="70" width="10" height="10" fill={p[2]} opacity="0.4"/>
            <rect x="60" y="70" width="10" height="10" fill={p[2]} opacity="0.4"/>
            <rect x="80" y="70" width="10" height="10" fill={p[2]} opacity="0.4"/>
            <path d="M0 95 L200 95 L200 125 L0 125 Z" fill="rgba(0,0,0,0.18)"/>
          </g>
        )}
        {kind === 'condo' && (
          <g>
            <path d="M60 110 L60 30 L130 30 L130 110 Z" fill="rgba(255,255,255,0.95)"/>
            {[...Array(7)].map((_, r) => [...Array(4)].map((_, c) => (
              <rect key={`${r}-${c}`} x={68 + c*16} y={38 + r*10} width="10" height="6" fill={p[2]} opacity="0.5" />
            )))}
            <path d="M0 110 L200 110 L200 125 L0 125 Z" fill="rgba(0,0,0,0.2)"/>
          </g>
        )}
        {kind === 'townhome' && (
          <g>
            {[0, 1, 2].map(i => (
              <g key={i} transform={`translate(${30 + i*45}, 0)`}>
                <path d="M0 100 L0 65 L25 50 L50 65 L50 100 Z" fill="rgba(255,255,255,0.92)"/>
                <rect x="18" y="78" width="14" height="22" fill={p[2]} opacity="0.45"/>
                <rect x="6" y="72" width="8" height="8" fill={p[2]} opacity="0.4"/>
                <rect x="36" y="72" width="8" height="8" fill={p[2]} opacity="0.4"/>
              </g>
            ))}
            <path d="M0 100 L200 100 L200 125 L0 125 Z" fill="rgba(0,0,0,0.18)"/>
          </g>
        )}
      </svg>
      {label && (
        <div style={{
          position: 'absolute', top: 12, left: 12,
          background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(6px)',
          padding: '4px 9px', borderRadius: 999,
          fontFamily: 'var(--font-text)', fontSize: 11, fontWeight: 600,
          color: 'var(--text-1)', letterSpacing: '-0.01em',
        }}>{label}</div>
      )}
    </div>
  )
}
