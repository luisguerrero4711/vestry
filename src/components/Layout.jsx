import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'
import Sidebar from './Sidebar'

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  // Close drawer whenever the route changes
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  // Prevent body scroll while drawer is open on mobile
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

  return (
    <div className="app-shell">
      {/* ── Mobile top bar */}
      <header className="mobile-topbar">
        <button
          className="mobile-hamburger"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
        >
          <Menu size={20} strokeWidth={2} />
        </button>
        <span className="mobile-logo">
          Vestry<span className="mobile-logo-dot" />
        </span>
        {/* Spacer keeps logo centred */}
        <div style={{ width: 36 }} />
      </header>

      {/* ── Sidebar / mobile drawer */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* ── Page content */}
      <main className="app-main">
        {children}
      </main>
    </div>
  )
}
