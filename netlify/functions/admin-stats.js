// GET /.netlify/functions/admin-stats?userId=<uuid>
// Returns platform-wide stats for admin users only.
// Uses service role key — bypasses RLS.

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method not allowed' }
  }

  const userId = event.queryStringParameters?.userId
  if (!userId) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  // Verify the requesting user is an admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .single()

  if (!profile?.is_admin) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden' }) }
  }

  try {
    // Run all queries in parallel
    const [
      { data: planCounts },
      { data: properties },
      { data: paymentsAll },
      { data: paymentsMonth },
      { data: recentProfiles },
    ] = await Promise.all([
      // Users grouped by plan
      supabase
        .from('profiles')
        .select('plan, is_admin'),

      // Total property count
      supabase
        .from('properties')
        .select('id, user_id'),

      // All-time payments collected
      supabase
        .from('rent_payments')
        .select('amount')
        .eq('status', 'paid'),

      // This month's payments
      supabase
        .from('rent_payments')
        .select('amount')
        .eq('status', 'paid')
        .gte('paid_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]),

      // Recent 50 profiles for user table
      supabase
        .from('profiles')
        .select('id, plan, is_admin, created_at, stripe_subscription_id')
        .order('created_at', { ascending: false })
        .limit(50),
    ])

    // Plan breakdown
    const byPlan = { free: 0, pro: 0, portfolio: 0 }
    let totalUsers = 0
    for (const p of planCounts || []) {
      const key = p.plan || 'free'
      byPlan[key] = (byPlan[key] || 0) + 1
      totalUsers++
    }

    // MRR
    const mrr = (byPlan.pro * 29) + (byPlan.portfolio * 79)

    // Property count per user
    const propCountByUser = {}
    for (const p of properties || []) {
      propCountByUser[p.user_id] = (propCountByUser[p.user_id] || 0) + 1
    }

    // Payment totals
    const totalCollected = (paymentsAll || []).reduce((s, p) => s + Number(p.amount), 0)
    const monthCollected = (paymentsMonth || []).reduce((s, p) => s + Number(p.amount), 0)

    // Get auth user emails via admin API
    const { data: { users: authUsers } } = await supabase.auth.admin.listUsers({ perPage: 200 })
    const emailById = {}
    for (const u of authUsers || []) {
      emailById[u.id] = u.email
    }

    // Build user rows
    const users = (recentProfiles || []).map(p => ({
      id:           p.id,
      email:        emailById[p.id] || '—',
      plan:         p.plan || 'free',
      is_admin:     p.is_admin,
      properties:   propCountByUser[p.id] || 0,
      subscribed:   !!p.stripe_subscription_id,
      joined:       p.created_at,
    }))

    return {
      statusCode: 200,
      body: JSON.stringify({
        users: {
          total:     totalUsers,
          by_plan:   byPlan,
        },
        mrr,
        properties: {
          total: (properties || []).length,
        },
        payments: {
          total_collected: totalCollected,
          month_collected: monthCollected,
        },
        user_list: users,
      }),
    }
  } catch (err) {
    console.error('admin-stats error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}
