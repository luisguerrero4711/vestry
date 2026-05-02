import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'

import Auth        from './pages/Auth'
import Dashboard   from './pages/Dashboard'
import Properties  from './pages/Properties'
import Tenants     from './pages/Tenants'
import Payments    from './pages/Payments'
import Leases      from './pages/Leases'
import Expenses    from './pages/Expenses'
import Reports     from './pages/Reports'
import Pricing     from './pages/Pricing'
import Admin       from './pages/Admin'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}><div className="spinner" /></div>
  return user ? children : <Navigate to="/auth" replace />
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? <Navigate to="/dashboard" replace /> : children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<PublicRoute><Auth /></PublicRoute>} />

          <Route path="/dashboard"  element={<PrivateRoute><Dashboard  /></PrivateRoute>} />
          <Route path="/properties" element={<PrivateRoute><Properties /></PrivateRoute>} />
          <Route path="/tenants"    element={<PrivateRoute><Tenants    /></PrivateRoute>} />
          <Route path="/payments"   element={<PrivateRoute><Payments   /></PrivateRoute>} />
          <Route path="/leases"     element={<PrivateRoute><Leases     /></PrivateRoute>} />
          <Route path="/expenses"   element={<PrivateRoute><Expenses   /></PrivateRoute>} />
          <Route path="/reports"    element={<PrivateRoute><Reports    /></PrivateRoute>} />
          <Route path="/pricing"    element={<PrivateRoute><Pricing    /></PrivateRoute>} />
          <Route path="/admin"      element={<PrivateRoute><Admin      /></PrivateRoute>} />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
