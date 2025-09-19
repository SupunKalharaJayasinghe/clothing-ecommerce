import rateLimit from 'express-rate-limit'
import { env } from './env.js'

const allowedOrigins = (env.CORS_ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)

export const corsOptions = {
  origin(origin, callback) {
    // allow same-origin / tools (no Origin header)
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    return callback(new Error('CORS: origin not allowed'), false)
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With']
}

// allow PayHere scripts/frames later; add your CDN if needed
export const cspDirectives = {
  "default-src": ["'self'"],
  "base-uri": ["'self'"],
  "font-src": ["'self'", "https:", "data:"],
  "img-src": ["'self'", "data:", "https:"],
  "script-src": ["'self'", "https://www.payhere.lk"],       // for onsite SDK
  "frame-src": ["'self'", "https://www.payhere.lk"],
  "style-src": ["'self'", "'unsafe-inline'", "https:"],
  "connect-src": ["'self'", ...allowedOrigins]
}

export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,   // tighter window for API
  limit: 120,            // requests per minute
  standardHeaders: true,
  legacyHeaders: false
})
