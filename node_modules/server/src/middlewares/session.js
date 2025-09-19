import { verifyJwt, signJwt } from '../utils/jwt.js'
import { env } from '../config/env.js'

// Refresh JWT cookie when it's close to expiring (rolling session)
export function refreshJwtIfNeeded(req, res, next) {
  const token = req.cookies?.access_token
  if (!token) return next()

  try {
    const payload = verifyJwt(token)
    const now = Math.floor(Date.now() / 1000)
    const secondsLeft = (payload?.exp || 0) - now
    const threshold = 3 * 24 * 60 * 60 // 3 days
    if (secondsLeft > 0 && secondsLeft < threshold) {
      const fresh = signJwt({ sub: payload.sub, email: payload.email, roles: payload.roles })
      res.cookie('access_token', fresh, {
        httpOnly: true,
        sameSite: env.COOKIE_SAMESITE,
        secure: env.COOKIE_SECURE === 'true',
        maxAge: 7 * 24 * 60 * 60 * 1000
      })
    }
  } catch {
    // ignore invalid/expired token here; downstream routes will 401 if required
  }
  next()
}


