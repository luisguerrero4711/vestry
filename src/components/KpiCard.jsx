export default function KpiCard({ label, value, color = 'dark', icon }) {
  const colorMap = {
    accent: 'var(--stat-col)',
    green:  '#059669',
    dark:   'var(--text)',
    muted:  'var(--muted)',
  }

  return (
    <div style={styles.card}>
      {icon && <div style={styles.icon}>{icon}</div>}
      <div style={{ ...styles.value, color: colorMap[color] ?? colorMap.dark }}>
        {value}
      </div>
      <div style={styles.label}>{label}</div>
    </div>
  )
}

const styles = {
  card: {
    background: 'var(--cream)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  icon: {
    fontSize: 20,
    marginBottom: 4,
  },
  value: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 28,
    fontWeight: 600,
    lineHeight: 1,
  },
  label: {
    fontSize: 10.5,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'var(--muted)',
  },
}
