import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { isDemoUser } from '../lib/demoData'
import { VT, VIcon } from '../lib/vestry-shared'

const money = (n) => `$${Number(n || 0).toLocaleString()}`

/**
 * Generate a Stripe payment link for an outstanding rent_payments row and
 * hand it to the landlord to send to the tenant.
 * props: payment { id, tenant_id, amount, tenantName, propertyName, notes, payment_link }
 *        onClose, onLinked(paymentId, url)
 */
export default function RequestPaymentModal({ payment, onClose, onLinked }) {
  const { user } = useAuth()
  const demo = isDemoUser(user)
  const [url, setUrl] = useState(payment.payment_link || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const generate = async () => {
    if (demo) { setError('Demo mode — connect Stripe to collect rent online.'); return }
    if (!payment.tenant_id) { setError('This charge has no tenant attached — add one first.'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/.netlify/functions/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_id: payment.id,
          tenant_id: payment.tenant_id,
          amount: Number(payment.amount),
          description: payment.notes || 'Monthly rent',
          property_name: payment.propertyName || 'your rental',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not create payment link.')
      setUrl(data.url)
      onLinked?.(payment.id, data.url)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch {}
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)',
      backdropFilter: 'blur(6px)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: VT.card, borderRadius: 18, width: '100%', maxWidth: 420, boxShadow: VT.shadowLg }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${VT.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: VT.fontDisplay, fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em' }}>Request payment</div>
            <div style={{ fontSize: 12, color: VT.text3, fontWeight: 500, marginTop: 2 }}>{payment.tenantName || 'Tenant'} · {money(payment.amount)}</div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, background: VT.tint, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <VIcon.X s={14} c={VT.text2} />
          </button>
        </div>

        <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 13 }}>
          {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#b91c1c', fontWeight: 500 }}>{error}</div>}
          {demo && <div style={{ background: VT.brandTint, borderRadius: 8, padding: '8px 12px', fontSize: 12, color: VT.brand, fontWeight: 500 }}>Demo mode — connect Stripe to collect rent online.</div>}

          {!url ? (
            <>
              <p style={{ fontSize: 13, color: VT.text2, fontWeight: 500, lineHeight: 1.6, margin: 0 }}>
                Generate a secure Stripe checkout link for this charge. Send it to the tenant — when they pay, the payment is marked received automatically. The card processing fee is added on top for the tenant.
              </p>
              <button onClick={generate} disabled={loading || demo} style={{ padding: '10px', background: VT.brand, border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer', opacity: (loading || demo) ? 0.6 : 1 }}>
                {loading ? 'Creating link…' : 'Create payment link'}
              </button>
            </>
          ) : (
            <>
              <div style={{ fontSize: 11, fontWeight: 600, color: VT.text3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Payment link</div>
              <div style={{ padding: '9px 12px', background: VT.tint, borderRadius: 10, fontSize: 12, color: VT.text2, wordBreak: 'break-all', fontFamily: VT.fontMono }}>{url}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={copy} style={{ flex: 1, padding: '10px', background: VT.brand, border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>
                  {copied ? 'Copied!' : 'Copy link'}
                </button>
                <button onClick={() => window.open(url, '_blank')} style={{ flex: 1, padding: '10px', background: VT.tint, border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, color: VT.text2, cursor: 'pointer' }}>
                  Open
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
