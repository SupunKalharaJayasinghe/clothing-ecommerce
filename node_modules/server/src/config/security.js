import rateLimit from 'express-rate-limit'
import { env } from './env.js'

export const corsOptions = {
  origin: [env.CORS_ORIGIN],
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
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
  "connect-src": ["'self'", env.CORS_ORIGIN]
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
