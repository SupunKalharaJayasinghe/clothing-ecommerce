import { verifyJwt } from '../utils/jwt.js'
import User from '../api/models/User.js'

export async function requireAuth(req, res, next) {
  const token =
    req.cookies?.access_token ||
    (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null)

  if (!token) return res.status(401).json({ ok: false, message: 'Unauthorized' })

  try {
    const payload = verifyJwt(token)
    req.user = payload

    // Load the current user document for downstream controllers (e.g., favorites)
    const user = await User.findById(payload.sub)
    if (!user) return res.status(401).json({ ok: false, message: 'Invalid or expired token' })

    req.userDoc = user
    next()
  } catch {
    return res.status(401).json({ ok: false, message: 'Invalid or expired token' })
  }
}
