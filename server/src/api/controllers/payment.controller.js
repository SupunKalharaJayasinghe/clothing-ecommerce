import axios from 'axios'
import { getPayHereBase, makeCheckoutHash } from '../utils/payhere.js'

/**
 * Client → POST /api/payments/payhere/init
 * Body: { orderId, amount, currency?, return_url?, cancel_url? }
 * Returns: { ok, action, fields } where you submit <form action=action method="post">fields...</form>
 */
export async function initPayHere(req, res) {
  try {
    const {
      orderId,                 // CHANGE: your own order identifier
      amount,                  // number or string
      currency = 'LKR',
      return_url,              // optional override
      cancel_url               // optional override
    } = req.body || {}

    // --- CHANGE: Validate inputs in your project style
    if (!orderId || !amount) {
      return res.status(400).json({ ok: false, message: 'orderId and amount are required' })
    }

    const { checkout } = getPayHereBase()

    const merchant_id = process.env.PAYHERE_MERCHANT_ID
    const merchant_secret = process.env.PAYHERE_MERCHANT_SECRET
    const notify_url = process.env.PAYHERE_NOTIFY_URL

    // Amount must be 2 decimals (string), or PayHere will reject
    const amountStr = Number(amount).toFixed(2)

    // Build the fields for form post
    const fields = {
      merchant_id,
      return_url: return_url || `${process.env.CLIENT_BASE_URL}/orders`,     // CHANGE if you want a specific success page
      cancel_url: cancel_url || `${process.env.CLIENT_BASE_URL}/checkout`,   // CHANGE if you want a specific cancel page
      notify_url,
      order_id: String(orderId),
      items: `Order #${orderId}`,
      currency,
      amount: amountStr,
    }

    // Create the signature on the server (never expose secret in frontend)
    const hash = makeCheckoutHash({
      merchant_id,
      order_id: fields.order_id,
      amount: fields.amount,
      currency: fields.currency,
      merchant_secret
    })

    // PayHere expects 'hash' field (for new docs it can be 'hash', older docs 'md5sig')
    fields.hash = hash

    // You can persist a pending order here in your DB if you have one (optional)

    return res.json({
      ok: true,
      action: checkout, // form action
      fields
    })
  } catch (err) {
    console.error('initPayHere error:', err)
    return res.status(500).json({ ok: false, message: 'Failed to init PayHere' })
  }
}

/**
 * PayHere → POST /api/payments/payhere/webhook
 * Body is x-www-form-urlencoded
 * Typical fields include: order_id, payment_id, status_code, md5sig, method, etc.
 * We will TRUST-BUT-VERIFY by calling Payment Retrieval API using App ID/Secret.
 */
export async function payHereWebhook(req, res) {
  try {
    const { order_id } = req.body || {}
    if (!order_id) {
      // Always 200 to stop repeated retries, but log the issue
      console.warn('Webhook received without order_id', req.body)
      return res.status(200).json({ ok: true })
    }

    // Retrieve from API to confirm status
    const result = await paymentRetrieval(order_id)
    const status = result?.data?.[0]?.status   // Expected: 'SUCCESS', 'CANCELED', etc.

    // --- CHANGE: Update your Order in DB here based on status ---
    // e.g. if (status === 'SUCCESS') mark as PAID, else FAILED/CANCELED

    console.log(`✅ Order ${order_id} status from retrieval:`, status)
    return res.json({ ok: true })
  } catch (err) {
    console.error('webhook error:', err.response?.data || err.message)
    // Respond 200 so PayHere doesn’t retry forever; you already logged it
    return res.status(200).json({ ok: true })
  }
}

/**
 * Optional Admin API: POST /api/payments/payhere/retrieve
 * Body: { orderId }
 */
export async function retrievePayment(req, res) {
  try {
    const { orderId } = req.body || {}
    if (!orderId) return res.status(400).json({ ok: false, message: 'orderId required' })

    const data = await paymentRetrieval(orderId)
    return res.json({ ok: true, data })
  } catch (err) {
    console.error('retrievePayment error:', err.response?.data || err.message)
    return res.status(500).json({ ok: false, message: 'Failed to retrieve payment' })
  }
}

/**
 * Internal helper: Payment Retrieval API (server-to-server)
 * Requires App ID + App Secret from Sandbox API Key
 */
async function paymentRetrieval(orderId) {
  const { api } = getPayHereBase()
  const APP_ID = process.env.PAYHERE_APP_ID
  const APP_SECRET = process.env.PAYHERE_APP_SECRET

  // --- CHANGE: this endpoint path may differ in docs you follow;
  // the commonly used sandbox path is /merchant/v1/payment/search
  const url = `${api}/merchant/v1/payment/search`

  const payload = {
    app_id: APP_ID,
    app_secret: APP_SECRET,
    order_id: String(orderId)
  }

  const response = await axios.post(url, payload)
  return response.data
}
