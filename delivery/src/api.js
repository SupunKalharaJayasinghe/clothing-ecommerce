// Minimal API wrapper for delivery panel
const API_BASE = window.DELIVERY_API_BASE || 'http://localhost:4000/api'

function getCookie(name) {
  return document.cookie
    .split('; ')
    .map(v => v.split('='))
    .reduce((acc, [k, val]) => ({ ...acc, [decodeURIComponent(k)]: decodeURIComponent(val || '') }), {})[name]
}

async function http(path, { method = 'GET', body, headers = {} } = {}) {
  const init = {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(method !== 'GET' && method !== 'HEAD' ? { 'x-csrf-token': getCookie('csrf_token') || '' } : {}),
      ...headers
    }
  }
  if (body !== undefined) init.body = JSON.stringify(body)
  const res = await fetch(`${API_BASE}${path}`, init)
  const ct = res.headers.get('content-type') || ''
  const data = ct.includes('application/json') ? await res.json() : await res.text()
  if (!res.ok) {
    const message = data?.message || res.statusText
    throw new Error(message)
  }
  return data
}

export const api = {
  health: () => http('/health'),
  me: () => http('/delivery/auth/me'),
  login: (identifier, password) => http('/delivery/auth/login', { method: 'POST', body: { identifier, password } }),
  verifyEmailLogin: (tmpToken, code) => http('/delivery/auth/login/verify', { method: 'POST', body: { tmpToken, code } }),
  register: (payload) => http('/delivery/auth/register', { method: 'POST', body: payload }),
  logout: () => http('/delivery/auth/logout', { method: 'POST' }),
  listOrders: (status, method) => http(`/delivery/orders${[status ? `status=${encodeURIComponent(status)}` : '', method ? `method=${encodeURIComponent(method)}` : ''].filter(Boolean).map((v,i)=> (i===0?'?':'&')+v).join('')}`),
  setOrderStatus: (id, status, extra) => http(`/delivery/orders/${id}/status`, { method: 'PATCH', body: { status, ...(extra || {}) } }),
  // COD-specific endpoints for payment updates
  setCodPayment: (id, action) => http(`/delivery/cod/${id}/payment`, { method: 'PATCH', body: { action } })
}
