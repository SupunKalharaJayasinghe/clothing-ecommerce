import api from '../lib/api' // your axios instance

// CHANGE: call backend to get a ready-to-submit form (action + fields)
export async function initPayHereSession({ orderId, amount, currency = 'LKR', return_url, cancel_url }) {
  const { data } = await api.post('/payments/payhere/init', {
    orderId,
    amount,
    currency,
    return_url,
    cancel_url
  })
  return data
}
