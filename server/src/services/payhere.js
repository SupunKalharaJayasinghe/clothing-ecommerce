// server/src/services/payhere.js
// HUMAN: Me file eka thama PayHere walata one 3 de walata support karanne:
// 1) request hash (form submit protection), 2) sandbox/live action URL pick,
// 3) webhook md5sig verify

import crypto from 'crypto'

const ACTIONS = {
  sandbox: 'https://sandbox.payhere.lk/pay/checkout', // HUMAN: Sandbox URL (dev/test)
  live: 'https://www.payhere.lk/pay/checkout'         // HUMAN: Live URL (prod)
}

// HUMAN: Checkout form ekata yawanna one hash eka hadanne me function eken.
// HASH = UPPERCASE( MD5( merchant_id + order_id + amount(2dp) + currency + UPPER(MD5(merchant_secret)) ) )
export function buildRequestHash({ merchantId, merchantSecret, orderId, amount, currency }) {
  const amountStr = Number(amount).toFixed(2) // HUMAN: 2 decimals aniwarenma
  const secretHash = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase()
  const raw = merchantId + orderId + amountStr + currency + secretHash
  return crypto.createHash('md5').update(raw).digest('hex').toUpperCase()
}

// HUMAN: Environment eka anuwa sandbox/live action URL ganna
export function checkoutAction(isLive = false) {
  return isLive ? ACTIONS.live : ACTIONS.sandbox
}

// HUMAN: Webhook (notify_url) verify karanna one signature eka mehema hadala match karanawa
// local = UPPER(MD5( merchant_id + order_id + payhere_amount + payhere_currency + status_code + UPPER(MD5(merchant_secret)) ))
export function verifyWebhookSig({ merchantId, merchantSecret, orderId, payhereAmount, payhereCurrency, statusCode, md5sig }) {
  const secretHash = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase()
  const raw = merchantId + orderId + String(payhereAmount || '') + String(payhereCurrency || '') + String(statusCode || '') + secretHash
  const local = crypto.createHash('md5').update(raw).digest('hex').toUpperCase()
  return String(md5sig || '').toUpperCase() === local
}
