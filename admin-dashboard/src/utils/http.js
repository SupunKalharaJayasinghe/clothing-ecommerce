import axios from 'axios'

export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api'
export const API_ORIGIN = API_BASE.replace(/\/?api\/?$/, '')

export function fileUrl(u) {
  if (!u) return u
  if (/^https?:\/\//i.test(u)) return u
  if (u.startsWith('/')) return API_ORIGIN + u
  return API_ORIGIN + '/' + u.replace(/^\/?/, '')
}

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
})

// Attach CSRF token from cookie for unsafe methods (double-submit cookie pattern)
function getCookie(name) {
  return document.cookie
    .split('; ')
    .map(v => v.split('='))
    .reduce((acc, [k, val]) => ({ ...acc, [decodeURIComponent(k)]: decodeURIComponent(val || '') }), {})[name]
}

api.interceptors.request.use((config) => {
  const method = (config.method || 'get').toLowerCase()
  if (!['get','head','options'].includes(method)) {
    const csrf = getCookie('csrf_token')
    if (csrf) config.headers['x-csrf-token'] = csrf
  }
  return config
})
