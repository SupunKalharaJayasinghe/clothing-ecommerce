import crypto from 'crypto'
import { env } from '../config/env.js'

function md5Upper(input) {
  return crypto.createHash('md5').update(String(input)).digest('hex').toUpperCase()
}

export function buildPayHereCheckout({ order, address, user }) {
  const isProd = env.NODE_ENV === 'production'
  const action = isProd
    ? 'https://www.payhere.lk/pay/checkout'
    : 'https://sandbox.payhere.lk/pay/checkout'

  const merchant_id = env.PAYHERE_MERCHANT_ID || 'YOUR_MERCHANT_ID'
  const amount = Number(order?.totals?.grandTotal || 0).toFixed(2)
  const currency = 'LKR'
  const order_id = String(order?._id || '')

  // Build md5sig if we have merchant secret configured
  let md5sig
  if (env.PAYHERE_MERCHANT_SECRET) {
    const secretHash = md5Upper(env.PAYHERE_MERCHANT_SECRET)
    md5sig = md5Upper(`${merchant_id}${order_id}${amount}${currency}${secretHash}`)
  }

  const fullName = (user?.name || '').trim()
  const [first_name = 'Customer', ...rest] = fullName.split(' ').filter(Boolean)
  const last_name = rest.join(' ') || 'User'

  const params = {
    merchant_id,
    return_url: env.PAYHERE_RETURN_URL || 'http://localhost:5173/orders',
    cancel_url: env.PAYHERE_CANCEL_URL || 'http://localhost:5173/checkout',
    notify_url: env.PAYHERE_NOTIFY_URL || 'http://localhost:4000/api/payments/payhere/webhook',
    order_id,
    items: `Order ${order_id}`,
    currency,
    amount,
    first_name,
    last_name,
    email: user?.email || 'email@example.com',
    phone: address?.phone || '',
    address: `${address?.line1 || ''} ${address?.line2 || ''}`.trim(),
    city: address?.city || '',
    country: address?.country || ''
  }

  if (md5sig) params.md5sig = md5sig

  return { action, params, sandbox: !isProd }
}