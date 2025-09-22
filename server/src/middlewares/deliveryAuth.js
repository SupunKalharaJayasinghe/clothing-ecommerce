import { verifyJwt } from '../utils/jwt.js'
import Delivery from '../api/models/Delivery.js'

export async function requireDeliveryAuth(req, res, next) {
  const token =
    req.cookies?.delivery_access_token ||
    (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null)

  if (!token) return res.status(401).json({ ok: false, message: 'Unauthorized (delivery)' })

  try {
    const payload = verifyJwt(token)
    if (payload.kind !== 'delivery') return res.status(401).json({ ok: false, message: 'Invalid delivery token' })

    req.delivery = payload

    const d = await Delivery.findById(payload.sub)
    if (!d || !d.active) return res.status(401).json({ ok: false, message: 'Invalid or inactive delivery user' })

    req.deliveryDoc = d
    next()
  } catch {
    return res.status(401).json({ ok: false, message: 'Invalid or expired token' })
  }
}
