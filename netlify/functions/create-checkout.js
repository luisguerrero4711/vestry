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
    const { payment_id, tenant_id, amount, description, property_name } = JSON.parse(event.body)

    // Get tenant info
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('stripe_customer_id, email, first_name, last_name')
      .eq('id', tenant_id)
      .single()

    if (tenantError || !tenant) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Tenant not found' }) }
    }

    // Create or reuse Stripe customer
    let customerId = tenant.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: tenant.email,
        name: `${tenant.first_name} ${tenant.last_name}`,
        metadata: { tenant_id },
      })
      customerId = customer.id
      await supabase
        .from('tenants')
        .update({ stripe_customer_id: customerId })
        .eq('id', tenant_id)
    }

    const rentCents = Math.round(amount * 100)

    // Gross up to cover card processing fee (2.9% + $0.30) — tenant pays
    // Formula: grossed = ceil((rent + 30) / (1 - 0.029))
    const totalCents = Math.ceil((rentCents + 30) / (1 - 0.029))
    const feeCents = totalCents - rentCents

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card', 'us_bank_account'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Rent — ${property_name}`,
              description: description || undefined,
            },
            unit_amount: rentCents,
          },
          quantity: 1,
        },
        {
          price_data: {
            currency: 'usd',
            product_data: { name: 'Processing Fee' },
            unit_amount: feeCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.URL || 'https://vestry-app.netlify.app'}/payments?paid=true`,
      cancel_url: `${process.env.URL || 'https://vestry-app.netlify.app'}/payments`,
      metadata: { payment_id, tenant_id },
      payment_intent_data: {
        setup_future_usage: 'off_session',
        metadata: { payment_id, tenant_id },
      },
      consent_collection: {
        payment_method_reuse_agreement: { position: 'auto' },
      },
    })

    // Save payment link to record
    await supabase
      .from('rent_payments')
      .update({ payment_link: session.url })
      .eq('id', payment_id)

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: session.url }),
    }
  } catch (err) {
    console.error('create-checkout error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}
