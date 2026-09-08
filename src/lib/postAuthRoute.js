import { supabase } from './supabase'

// ─────────────────────────────────────────────────────────────
// Where to send a user right after they authenticate.
//
// Single source of truth so email/password sign-in (Auth.jsx) and
// the OAuth callback (AuthCallback.jsx) route identically:
//   • platform admin        → /admin
//   • role already chosen    → /dashboard
//   • no role yet            → /role-selection
//
// The demo session isn't a real Supabase user, so it just lands
// on the dashboard.
// ─────────────────────────────────────────────────────────────
export async function routeAfterAuth(navigate) {
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user

  // Demo mode (or session not ready) — nothing to look up.
  if (!user) {
    navigate('/dashboard', { replace: true })
    return
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_admin')
    .eq('id', user.id)
    .single()

  if (profile?.is_admin) {
    navigate('/admin', { replace: true })
  } else if (profile?.role === 'landlord' || profile?.role === 'tenant') {
    navigate('/dashboard', { replace: true })
  } else {
    navigate('/role-selection', { replace: true })
  }
}
