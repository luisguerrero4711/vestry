import Sidebar from './Sidebar'

export default function Layout({ children }) {
  return (
    <div style={styles.shell}>
      <Sidebar />
      <main style={styles.main}>
        {children}
      </main>
    </div>
  )
}

const styles = {
  shell: {
    display: 'flex',
    minHeight: '100vh',
    background: 'var(--cream)',
  },
  main: {
    flex: 1,
    minWidth: 0,
    overflowY: 'auto',
  },
}
