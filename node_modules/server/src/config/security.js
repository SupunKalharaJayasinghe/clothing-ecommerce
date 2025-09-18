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
  "script-src": ["'self'", "https://www.payhere.lk"],       // for onsite SDK
  "frame-src": ["'self'", "https://www.payhere.lk"],
  "style-src": ["'self'", "'unsafe-inline'", "https:"],
  "connect-src": ["'self'", env.CORS_ORIGIN]
}

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false
})
