// CHANGE: Helpers for sandbox/live base + md5 signature generation
import crypto from 'crypto'

export function getPayHereBase() {
  const isLive = (process.env.PAYHERE_ENV || 'sandbox').toLowerCase() === 'live'
  return {
    checkout: isLive
      ? 'https://www.payhere.lk/pay/checkout'
      : 'https://sandbox.payhere.lk/pay/checkout',
    api: isLive
      ? 'https://www.payhere.lk'
      : 'https://sandbox.payhere.lk'
  }
}

/**
 * PayHere classic signature (hash) used in the browser POST form
 * hash = md5(merchant_id + order_id + amount + currency + merchant_secret).toUpperCase()
 * NOTE: generate on the server so MERCHANT_SECRET never leaves the backend.
 */
export function makeCheckoutHash({ merchant_id, order_id, amount, currency, merchant_secret }) {
  const data = `${merchant_id}${order_id}${amount}${currency}${merchant_secret}`
  const md5 = crypto.createHash('md5').update(data).digest('hex').toUpperCase()
  return md5
}
