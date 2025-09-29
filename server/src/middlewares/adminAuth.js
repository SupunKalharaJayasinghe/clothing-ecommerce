import { verifyJwt } from '../utils/jwt.js'
import Admin from '../api/models/Admin.js'

export async function requireAdminAuth(req, res, next) {
  const token =
    req.cookies?.admin_access_token ||
    (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null)

  if (!token) return res.status(401).json({ ok: false, message: 'Unauthorized (admin)' })

  try {
    const payload = verifyJwt(token)
    if (payload.kind !== 'admin') return res.status(401).json({ ok: false, message: 'Invalid admin token' })

    req.admin = payload

    const admin = await Admin.findById(payload.sub)
    if (!admin) return res.status(401).json({ ok: false, message: 'Invalid or expired token' })

    req.adminDoc = admin
    next()
  } catch {
    return res.status(401).json({ ok: false, message: 'Invalid or expired token' })
  }
}
