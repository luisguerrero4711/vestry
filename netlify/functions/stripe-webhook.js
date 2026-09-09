const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

exports.handler = async (event) => {
  const sig = event.headers['stripe-signature']

  // Netlify may hand us the body base64-encoded; Stripe needs the raw bytes.
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64')
    : event.body

  let stripeEvent
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    console.error('Webhook signature error:', err.message)
    return { statusCode: 400, body: `Webhook Error: ${err.message}` }
  }

  const today = () => new Date().toISOString().split('T')[0]

  // Write an audit row; ignore failures (table lights up after the ledger migration).
  const logEvent = async (row) => {
    try { await supabase.from('payment_events').insert([row]) } catch (_) { /* noop */ }
  }
  const markPayment = async (id, fields) => {
    const q = await supabase.from('rent_payments').update(fields).eq('id', id)
    if (q.error && /column .* does not exist|schema cache/i.test(q.error.message || '')) {
      const { state, amount_cents, ...safe } = fields
      await supabase.from('rent_payments').update(safe).eq('id', id)
    }
  }

  switch (stripeEvent.type) {
    // ── Card checkout completes synchronously; ACH (us_bank_account) does NOT ──
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded':
    case 'checkout.session.async_payment_failed': {
      const session = stripeEvent.data.object
      const { payment_id } = session.metadata || {}
      if (!payment_id) break

      const failed = stripeEvent.type === 'checkout.session.async_payment_failed'
      // 'completed' with payment_status 'paid' = card settled now; otherwise ACH pending
      const settledNow = !failed && session.payment_status === 'paid'
      const pending = !failed && !settledNow

      if (failed) {
        await markPayment(payment_id, { state: 'failed' })
        await logEvent({ rent_payment_id: payment_id, kind: 'note', reason: 'Stripe payment failed' })
      } else if (pending) {
        await markPayment(payment_id, {
          state: 'processing', payment_method: 'stripe',
          stripe_payment_intent_id: session.payment_intent,
        })
      } else {
        await markPayment(payment_id, {
          status: 'paid', paid_date: today(), state: 'settled',
          payment_method: 'stripe', stripe_payment_intent_id: session.payment_intent,
          ...(session.amount_total ? { amount_cents: session.amount_total } : {}),
        })
        await logEvent({ rent_payment_id: payment_id, kind: 'recorded', amount_cents: session.amount_total || null, reason: 'Stripe payment settled' })
      }
      break
    }

    // ── Card charge refunded / disputed → reverse the payment ────────────────
    case 'charge.refunded':
    case 'charge.dispute.created': {
      const charge = stripeEvent.data.object
      const pi = charge.payment_intent
      if (!pi) break
      const { data: pmt } = await supabase
        .from('rent_payments').select('id, due_date').eq('stripe_payment_intent_id', pi).maybeSingle()
      if (pmt) {
        const overdue = pmt.due_date && new Date(pmt.due_date) < new Date()
        await markPayment(pmt.id, { state: 'reversed', status: overdue ? 'overdue' : 'due', paid_date: null })
        await logEvent({ rent_payment_id: pmt.id, kind: stripeEvent.type === 'charge.refunded' ? 'refunded' : 'reversed', reason: `Stripe ${stripeEvent.type}` })
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
        await markPayment(payment.id, {
          status: 'paid', paid_date: today(), state: 'settled',
          payment_method: 'autopay', stripe_payment_intent_id: invoice.payment_intent,
          ...(invoice.amount_paid ? { amount_cents: invoice.amount_paid } : {}),
        })
        await logEvent({ rent_payment_id: payment.id, kind: 'recorded', amount_cents: invoice.amount_paid || null, reason: 'Autopay invoice paid' })
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
