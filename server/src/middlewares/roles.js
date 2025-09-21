import ApiError from '../utils/ApiError.js'

export function requireAnyRole(...allowed) {
  const allowedSet = new Set(allowed)
  return function (req, _res, next) {
    // For admin endpoints, requireAdminAuth should run before and attach req.admin
    const adminRoles = req.admin?.roles || []
    if (adminRoles.includes('admin')) return next() // admin superuser
    const userRoles = req.user?.roles || [] // fallback for non-admin contexts
    const ok = adminRoles.some(r => allowedSet.has(r)) || userRoles.some(r => allowedSet.has(r))
    if (!ok) return next(new ApiError(403, 'Forbidden: insufficient role'))
    next()
  }
}

export const ROLES = Object.freeze({
  ADMIN: 'admin',
  USER_MANAGER: 'user_manager',
  PRODUCT_MANAGER: 'product_manager',
  ORDER_MANAGER: 'order_manager',
  PAYMENT_MANAGER: 'payment_manager',
  REFUND_MANAGER: 'refund_manager',
  RETURN_MANAGER: 'return_manager',
  REVIEW_MANAGER: 'review_manager',
})
