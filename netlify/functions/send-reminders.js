// Scheduled daily at noon UTC — sends rent reminder emails via Resend
const { createClient } = require('@supabase/supabase-js')
const { Resend } = require('resend')

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const resend = new Resend(process.env.RESEND_API_KEY)

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0)

exports.handler = async () => {
  if (!process.env.RESEND_API_KEY) {
    console.log('Resend not configured — skipping reminders.')
    return { statusCode: 200, body: JSON.stringify({ skipped: true }) }
  }

  try {
    // Get all active leases with tenant + property info
    const { data: leases, error } = await supabase
      .from('leases')
      .select(`
        id, reminder_days,
        tenant_id, property_id,
        tenants (first_name, last_name, email),
        properties (name)
      `)
      .eq('status', 'active')

    if (error) throw error

    let sent = 0

    for (const lease of leases || []) {
      const reminderDays = lease.reminder_days ?? 3
      const targetDate = new Date()
      targetDate.setDate(targetDate.getDate() + reminderDays)
      const targetDateStr = targetDate.toISOString().split('T')[0]

      // Find unpaid payments due on the target date
      const { data: payments } = await supabase
        .from('rent_payments')
        .select('id, amount, due_date, payment_link')
        .eq('tenant_id', lease.tenant_id)
        .in('status', ['due', 'overdue'])
        .eq('due_date', targetDateStr)

      for (const payment of payments || []) {
        const tenant = lease.tenants
        if (!tenant?.email) continue

        const dueDate = new Date(payment.due_date + 'T00:00:00')
        const dueDateStr = dueDate.toLocaleDateString('en-US', {
          month: 'long', day: 'numeric', year: 'numeric',
        })
        const propertyName = lease.properties?.name || 'your property'

        const payBtnHtml = payment.payment_link
          ? `<a href="${payment.payment_link}" style="display:inline-block;background:#c4704a;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;margin:20px 0;">Pay ${fmt(payment.amount)}</a>`
          : ''

        await resend.emails.send({
          from: 'Vestry <noreply@vestry.app>',
          to: tenant.email,
          subject: `Rent reminder — ${fmt(payment.amount)} due ${dueDateStr}`,
          html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f5f0eb;font-family:'Helvetica Neue',sans-serif;">
  <div style="max-width:480px;margin:40px auto;background:#fffaf7;border-radius:12px;border:1px solid #e8e0d8;overflow:hidden;">
    <div style="background:#1a1a2e;padding:24px 32px;">
      <span style="color:#c4704a;font-size:20px;font-weight:700;letter-spacing:0.05em;">VESTRY</span>
    </div>
    <div style="padding:32px;">
      <h2 style="margin:0 0 8px;color:#1a1a2e;font-size:22px;">Rent Reminder</h2>
      <p style="color:#555;margin:0 0 20px;">Hi ${tenant.first_name},</p>
      <p style="color:#333;margin:0 0 8px;">Your rent for <strong>${propertyName}</strong> is due on <strong>${dueDateStr}</strong>.</p>
      <p style="color:#1a1a2e;font-size:28px;font-weight:700;margin:16px 0;">${fmt(payment.amount)}</p>
      ${payBtnHtml}
      <p style="color:#888;font-size:12px;margin-top:24px;border-top:1px solid #e8e0d8;padding-top:16px;">
        If you've already paid, please disregard this message.<br>
        Questions? Reply to this email or contact your property manager.
      </p>
    </div>
  </div>
</body>
</html>`,
        })

        sent++
      }
    }

    console.log(`Sent ${sent} reminder email(s)`)
    return { statusCode: 200, body: JSON.stringify({ sent }) }
  } catch (err) {
    console.error('send-reminders error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}
