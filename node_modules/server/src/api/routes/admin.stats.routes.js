import { Router } from 'express'
import { requireAdminAuth } from '../../middlewares/adminAuth.js'
import { requireAnyRole, ROLES } from '../../middlewares/roles.js'
import { getStats } from '../controllers/admin.stats.controller.js'

const router = Router()
router.use(requireAdminAuth)

const canViewStats = requireAnyRole(
  ROLES.ADMIN,
  ROLES.ORDER_MANAGER,
  ROLES.PAYMENT_MANAGER,
  ROLES.RETURN_MANAGER,
  ROLES.REFUND_MANAGER,
  ROLES.PRODUCT_MANAGER
)

router.get('/', canViewStats, getStats)

export default router
