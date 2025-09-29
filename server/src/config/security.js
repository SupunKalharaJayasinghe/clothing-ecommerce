import rateLimit from 'express-rate-limit'
import { env } from './env.js'

const isProd = env.NODE_ENV === 'production'

// Allow multiple origins configured as comma-separated string in env.CORS_ORIGIN
const envOrigins = String(env.CORS_ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)

// In development, also allow common Vite dev/preview ports for admin, client, and delivery UIs
const devOrigins = [
  'http://localhost:5173', 'http://127.0.0.1:5173',
  'http://localhost:5174', 'http://127.0.0.1:5174',
  'http://localhost:5175', 'http://127.0.0.1:5175',
  'http://localhost:5176', 'http://127.0.0.1:5176',
  'http://localhost:5177', 'http://127.0.0.1:5177',
  'http://localhost:5178', 'http://127.0.0.1:5178',
]

const allowedOrigins = Array.from(new Set([ ...envOrigins, ...(isProd ? [] : devOrigins) ]))

export const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true) // allow same-origin or non-browser clients
    if (allowedOrigins.includes(origin)) return callback(null, true)
    // In development, allow any localhost/127.0.0.1 origin (e.g., Vite dev servers on dynamic ports)
    if (!isProd) {
      const localDev = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/
      if (localDev.test(origin)) return callback(null, true)
    }
    return callback(new Error('CORS not allowed from this origin: ' + origin), false)
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','x-csrf-token']
}

// allow PayHere scripts/frames later; add your CDN if needed
export const cspDirectives = {
  "default-src": ["'self'"],
  "base-uri": ["'self'"],
  "font-src": ["'self'", "https:", "data:"],
  "img-src": ["'self'", "data:", "https:"],
  "script-src": ["'self'", "https://www.payhere.lk"],
  "frame-src": ["'self'", "https://www.payhere.lk"],
  "style-src": ["'self'", "'unsafe-inline'", "https:"],
  "connect-src": ["'self'", ...allowedOrigins]
}

// General API limiter (relaxed in dev; skip common background endpoints)
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isProd ? 300 : 3000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: (req) => {
    if (req.method === 'OPTIONS') return true
    const url = req.originalUrl || ''
    if (url.startsWith('/api/health')) return true
    if (url.startsWith('/api/auth/me')) return true // don't count background session checks
    return false
  }
})

// Burst limiter just for auth endpoints (protect against credential stuffing)
export const authBurstLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: isProd ? 15 : 200, // generous in dev
  standardHeaders: 'draft-7',
  legacyHeaders: false
})
