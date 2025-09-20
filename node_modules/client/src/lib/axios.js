import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api',
  withCredentials: true,
  timeout: 15000
})

// Attach CSRF token for unsafe methods using double-submit cookie strategy
function getCookie(name) {
  const m = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return m ? decodeURIComponent(m[2]) : undefined
}

api.interceptors.request.use((cfg) => {
  const method = (cfg.method || 'get').toLowerCase()
  if (['post', 'put', 'patch', 'delete'].includes(method)) {
    const token = getCookie('csrf_token')
    if (token) {
      cfg.headers = cfg.headers || {}
      cfg.headers['x-csrf-token'] = token
    }
  }
  return cfg
})

// throttle rehydrate attempts
let lastRehydrate = 0
const REHYDRATE_COOLDOWN_MS = 5000

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const cfg = err.config || {}

    // simple one-shot retry on network error / timeout
    if (!cfg.__retried && (!err.response || err.code === 'ECONNABORTED')) {
      cfg.__retried = true
      return api(cfg)
    }

    // Avoid loops: never rehydrate for auth endpoints (login/register/me/2fa/etc.)
    const url = (cfg.url || '').toLowerCase()
    const isAuthRoute = url.startsWith('/auth/')
    const status = err.response?.status

    if (status === 401 && !cfg.__rehydrated && !isAuthRoute) {
      const now = Date.now()
      if (now - lastRehydrate > REHYDRATE_COOLDOWN_MS) {
        try {
          lastRehydrate = now
          cfg.__rehydrated = true
          // Best-effort call that may refresh rolling cookie on server
          await api.get('/auth/me')
          return api(cfg)
        } catch {
          // fall through to reject
        }
      }
    }

    // For 429 (Too Many Requests) just bubble up (UI can show a friendly toast)
    return Promise.reject(err)
  }
)

export default api
