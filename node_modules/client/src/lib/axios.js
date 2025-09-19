import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api',
  withCredentials: true,
  timeout: 15000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  }
})

// simple one-shot retry on network error / timeout
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const cfg = err.config || {}
    if (!cfg.__retried && (!err.response || err.code === 'ECONNABORTED')) {
      cfg.__retried = true
      return api(cfg)
    }
    // If unauthorized, try to re-hydrate user state once
    if (err.response && err.response.status === 401 && !cfg.__rehydrated) {
      try {
        cfg.__rehydrated = true
        // Best-effort fetch to refresh session via rolling cookie
        await api.get('/auth/me')
        return api(cfg)
      } catch {}
    }
    return Promise.reject(err)
  }
)

export default api
