const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

exports.handler = async (event) => {
  const sig = event.headers['stripe-signature']

  let stripeEvent
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    console.error('Webhook signature error:', err.message)
    return { statusCode: 400, body: `Webhook Error: ${err.message}` }
  }

  const today = () => new Date().toISOString().split('T')[0]

  switch (stripeEvent.type) {
    // ── One-time payment completed ──────────────────────────────────────────
    case 'checkout.session.completed': {
      const session = stripeEvent.data.object
      const { payment_id, tenant_id } = session.metadata || {}

      if (payment_id) {
        await supabase
          .from('rent_payments')
          .update({
            status: 'paid',
            paid_date: today(),
            payment_method: 'stripe',
            stripe_payment_intent_id: session.payment_intent,
          })
          .eq('id', payment_id)
      }
      break
    }

    // ── Autopay / subscription invoice paid ────────────────────────────────
    case 'invoice.paid': {
      const invoice = stripeEvent.data.object
      if (!invoice.subscription) break

      const { data: tenant } = await supabase
        .from('tenants')
        .select('id, property_id')
        .eq('stripe_customer_id', invoice.customer)
        .single()

      if (!tenant) break

      // Find oldest unpaid payment for this tenant and mark it paid
      const { data: payment } = await supabase
        .from('rent_payments')
        .select('id')
        .eq('tenant_id', tenant.id)
        .in('status', ['due', 'overdue'])
        .order('due_date', { ascending: true })
        .limit(1)
        .single()

      if (payment) {
        await supabase
          .from('rent_payments')
          .update({
            status: 'paid',
            paid_date: today(),
            payment_method: 'autopay',
            stripe_payment_intent_id: invoice.payment_intent,
          })
          .eq('id', payment.id)
      }
      break
    }

    // ── Autopay subscription created → save subscription ID on lease ───────
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = stripeEvent.data.object
      const supabaseUserId = sub.metadata?.supabase_user_id
      const plan           = sub.metadata?.plan

      // Case A: landlord subscription (has supabase_user_id + plan in metadata)
      if (supabaseUserId && plan) {
        const isActive  = ['active', 'trialing'].includes(sub.status)
        const newPlan   = isActive ? plan : 'free'
        await supabase
          .from('profiles')
          .update({ plan: newPlan, stripe_subscription_id: sub.id })
          .eq('id', supabaseUserId)
        break
      }

      // Case B: tenant autopay subscription → save on lease
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id')
        .eq('stripe_customer_id', sub.customer)
        .single()

      if (tenant) {
        await supabase
          .from('leases')
          .update({ stripe_subscription_id: sub.id })
          .eq('tenant_id', tenant.id)
          .eq('status', 'active')
      }
      break
    }

    // ── Landlord subscription cancelled / deleted ───────────────────────────
    case 'customer.subscription.deleted': {
      const sub            = stripeEvent.data.object
      const supabaseUserId = sub.metadata?.supabase_user_id
      if (supabaseUserId) {
        await supabase
          .from('profiles')
          .update({ plan: 'free', stripe_subscription_id: null })
          .eq('id', supabaseUserId)
      }
      break
    }

    default:
      break
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) }
}
