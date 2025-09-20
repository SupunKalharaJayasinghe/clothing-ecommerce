import rateLimit from 'express-rate-limit'
import { env } from './env.js'

// Allow multiple origins configured as comma-separated string in env.CORS_ORIGIN
const allowedOrigins = String(env.CORS_ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)

export const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true) // allow same-origin or non-browser clients
    if (allowedOrigins.includes(origin)) return callback(null, true)
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

const isProd = env.NODE_ENV === 'production'

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
