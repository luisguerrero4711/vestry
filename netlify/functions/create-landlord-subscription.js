// POST { planId: 'pro' | 'portfolio', userId, userEmail }
// Returns { url } — Stripe Checkout Session URL for landlord subscription

const Stripe = require('stripe')
const { createClient } = require('@supabase/supabase-js')

const stripe  = Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ── Stripe Price IDs ─────────────────────────────────────────
// After creating products in your Stripe dashboard, paste the Price IDs here.
const PRICE_IDS = {
  pro:       process.env.STRIPE_PRICE_PRO       || '',
  portfolio: process.env.STRIPE_PRICE_PORTFOLIO  || '',
}

const PLAN_NAMES = { pro: 'Pro ($29/mo)', portfolio: 'Portfolio ($79/mo)' }

exports.handler = async (event) => {
  if (!process.env.STRIPE_SECRET_KEY) {
    return { statusCode: 503, body: JSON.stringify({ error: 'Stripe not configured' }) }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' }
  }

  try {
    const { planId, userId, userEmail } = JSON.parse(event.body)

    if (!planId || !PRICE_IDS[planId]) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid plan' }) }
    }

    const priceId = PRICE_IDS[planId]
    if (!priceId) {
      return {
        statusCode: 503,
        body: JSON.stringify({ error: `Stripe price for "${planId}" not configured. Add STRIPE_PRICE_${planId.toUpperCase()} env var.` }),
      }
    }

    // Look up or create Stripe customer for this landlord
    const { data: prof } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single()

    let customerId = prof?.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: { supabase_user_id: userId },
      })
      customerId = customer.id

      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId)
    }

    // Create Checkout Session for subscription
    const session = await stripe.checkout.sessions.create({
      customer:   customerId,
      mode:       'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.URL || 'https://vestry-app.netlify.app'}/dashboard?upgraded=true`,
      cancel_url:  `${process.env.URL || 'https://vestry-app.netlify.app'}/pricing`,
      metadata:   { supabase_user_id: userId, plan: planId },
      subscription_data: {
        metadata: { supabase_user_id: userId, plan: planId },
      },
      allow_promotion_codes: true,
    })

    return { statusCode: 200, body: JSON.stringify({ url: session.url }) }
  } catch (err) {
    console.error('create-landlord-subscription error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}
