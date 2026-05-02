// POST { userId }
// Returns { url } — Stripe Billing Portal for landlord to manage their subscription

const Stripe = require('stripe')
const { createClient } = require('@supabase/supabase-js')

const stripe   = Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

exports.handler = async (event) => {
  if (!process.env.STRIPE_SECRET_KEY) {
    return { statusCode: 503, body: JSON.stringify({ error: 'Stripe not configured' }) }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' }
  }

  try {
    const { userId } = JSON.parse(event.body)

    const { data: prof } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single()

    if (!prof?.stripe_customer_id) {
      return { statusCode: 400, body: JSON.stringify({ error: 'No billing account found. Subscribe to a plan first.' }) }
    }

    const session = await stripe.billingPortal.sessions.create({
      customer:   prof.stripe_customer_id,
      return_url: `${process.env.URL || 'https://vestry-app.netlify.app'}/pricing`,
    })

    return { statusCode: 200, body: JSON.stringify({ url: session.url }) }
  } catch (err) {
    console.error('landlord-billing-portal error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}
