import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../../middlewares/validate.js'
import { requireAdminAuth } from '../../middlewares/adminAuth.js'
import { requireAnyRole, ROLES } from '../../middlewares/roles.js'
import { listOrders, getOrder, updateStatus, verifyBankSlip } from '../controllers/admin.orders.controller.js'

const router = Router()
router.use(requireAdminAuth)

const canManageOrders = requireAnyRole(ROLES.ADMIN, ROLES.ORDER_MANAGER, ROLES.PAYMENT_MANAGER)

const listSchema = z.object({
  query: z.object({
    q: z.string().optional(),
    status: z.string().optional(),
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
  }).optional()
})

const idParam = z.object({ params: z.object({ id: z.string().min(8) }) })

const statusSchema = z.object({
  params: z.object({ id: z.string().min(8) }),
  body: z.object({ status: z.string().min(2) })
})

router.get('/', canManageOrders, validate(listSchema), listOrders)
router.get('/:id', canManageOrders, validate(idParam), getOrder)
router.patch('/:id/status', canManageOrders, validate(statusSchema), updateStatus)
router.post('/:id/payments/bank/verify', canManageOrders, validate(idParam), verifyBankSlip)

export default router