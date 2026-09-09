import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'

import Landing        from './pages/Landing'
import Auth           from './pages/Auth'
import AuthCallback    from './pages/AuthCallback'
import RoleSelection   from './pages/RoleSelection'
import Dashboard       from './pages/Dashboard'
import Properties      from './pages/Properties'
import PropertyDetail  from './pages/PropertyDetail'
import RentRoll        from './pages/RentRoll'
import Tenants         from './pages/Tenants'
import Payments        from './pages/Payments'
import Leases          from './pages/Leases'
import LeaseDetail     from './pages/LeaseDetail'
import Expenses        from './pages/Expenses'
import Reports         from './pages/Reports'
import Pricing         from './pages/Pricing'
import Admin           from './pages/Admin'
import Settings        from './pages/Settings'

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
          <Route path="/"              element={<PublicRoute><Landing /></PublicRoute>} />
          <Route path="/auth"          element={<PublicRoute><Auth /></PublicRoute>} />
          {/* OAuth callback — no auth wrapper; Supabase establishes the session here */}
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/role-selection" element={<PrivateRoute><RoleSelection /></PrivateRoute>} />

          <Route path="/dashboard"      element={<PrivateRoute><Dashboard      /></PrivateRoute>} />
          <Route path="/properties"     element={<PrivateRoute><Properties     /></PrivateRoute>} />
          <Route path="/properties/:id" element={<PrivateRoute><PropertyDetail /></PrivateRoute>} />
          <Route path="/rent-roll"      element={<PrivateRoute><RentRoll       /></PrivateRoute>} />
          <Route path="/tenants"        element={<PrivateRoute><Tenants        /></PrivateRoute>} />
          <Route path="/payments"       element={<PrivateRoute><Payments       /></PrivateRoute>} />
          <Route path="/leases"         element={<PrivateRoute><Leases         /></PrivateRoute>} />
          <Route path="/leases/:id"     element={<PrivateRoute><LeaseDetail    /></PrivateRoute>} />
          <Route path="/expenses"   element={<PrivateRoute><Expenses   /></PrivateRoute>} />
          <Route path="/reports"    element={<PrivateRoute><Reports    /></PrivateRoute>} />
          <Route path="/pricing"    element={<PrivateRoute><Pricing    /></PrivateRoute>} />
          <Route path="/admin"      element={<PrivateRoute><Admin      /></PrivateRoute>} />
          <Route path="/settings"   element={<PrivateRoute><Settings   /></PrivateRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
