const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return { statusCode: 503, body: JSON.stringify({ error: 'Stripe not configured yet.' }) }
  }

  try {
    const { tenant_id } = JSON.parse(event.body)

    const { data: tenant } = await supabase
      .from('tenants')
      .select('stripe_customer_id, first_name, last_name')
      .eq('id', tenant_id)
      .single()

    if (!tenant?.stripe_customer_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'No payment history found for this tenant. Send a payment request first so they can save their payment method.',
        }),
      }
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: tenant.stripe_customer_id,
      return_url: `${process.env.URL || 'https://vestry-app.netlify.app'}/payments`,
    })

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: session.url }),
    }
  } catch (err) {
    console.error('billing-portal error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}
