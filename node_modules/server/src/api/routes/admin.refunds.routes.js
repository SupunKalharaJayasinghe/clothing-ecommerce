import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../../middlewares/validate.js'
import { requireAdminAuth } from '../../middlewares/adminAuth.js'
import { requireAnyRole, ROLES } from '../../middlewares/roles.js'
import { listRefunds, listRefundAudits } from '../controllers/admin.refunds.controller.js'

const router = Router()
router.use(requireAdminAuth)

const canManageRefunds = requireAnyRole(ROLES.ADMIN, ROLES.REFUND_MANAGER)

const listSchema = z.object({
  query: z.object({
    q: z.string().optional(),
    method: z.enum(['COD','CARD','BANK']).optional(),
    status: z.enum(['pending','initiated','paid','failed','refunded']).optional(),
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
  }).optional()
})

router.get('/', canManageRefunds, validate(listSchema), listRefunds)
router.get('/audits', canManageRefunds, validate(listSchema), listRefundAudits)

export default router