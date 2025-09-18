import { verifyJwt } from '../utils/jwt.js'

export function requireAuth(req, res, next) {
  const token = req.cookies?.access_token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null)
  if (!token) return res.status(401).json({ ok: false, message: 'Unauthorized' })
  try {
    const payload = verifyJwt(token)
    req.user = payload
    next()
  } catch {
    return res.status(401).json({ ok: false, message: 'Invalid or expired token' })
  }
}
