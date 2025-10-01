import crypto from 'crypto'
import { env } from '../config/env.js'

// Double-submit cookie CSRF protection
// - For safe methods (GET/HEAD/OPTIONS): if no token cookie, issue one
// - For unsafe methods (POST/PUT/PATCH/DELETE): require header x-csrf-token to match cookie value

const CSRF_COOKIE = 'csrf_token'
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])
const CSRF_EXEMPT_PATHS = new Set([
  '/api/payments/payhere/webhook'
])

export function csrfProtection(req, res, next) {
  const method = (req.method || 'GET').toUpperCase()
  const cookieToken = req.cookies?.[CSRF_COOKIE]

  if (SAFE_METHODS.has(method)) {
    // Lazily set a token cookie for the client to echo back later
    if (!cookieToken) {
      const token = crypto.randomBytes(24).toString('hex')
      res.cookie(CSRF_COOKIE, token, {
        httpOnly: false, // must be readable by client JS (double-submit)
        sameSite: env.COOKIE_SAMESITE,
        secure: env.COOKIE_SECURE === 'true',
        maxAge: 7 * 24 * 60 * 60 * 1000
      })
    }
    return next()
  }

  // For unsafe methods, allowlist webhook and other machine-to-machine endpoints
  if (CSRF_EXEMPT_PATHS.has(req.path)) {
    return next()
  }

  // For unsafe methods, validate match
  const headerToken = req.get('x-csrf-token')
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ ok: false, message: 'Invalid CSRF token' })
  }
  return next()
}
