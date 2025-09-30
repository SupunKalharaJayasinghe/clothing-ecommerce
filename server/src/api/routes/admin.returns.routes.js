import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../../middlewares/validate.js'
import { requireAdminAuth } from '../../middlewares/adminAuth.js'
import { requireAnyRole, ROLES } from '../../middlewares/roles.js'
import { listReturns, initReturn, updateReturnStatus, listReturnAudits, getReturnDetails } from '../controllers/admin.returns.controller.js'

const router = Router()
router.use(requireAdminAuth)

const canManageReturns = requireAnyRole(ROLES.ADMIN, ROLES.RETURN_MANAGER)

const listSchema = z.object({
  query: z.object({
    q: z.string().optional(),
    status: z.enum(['requested','approved','rejected','received','closed']).optional(),
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
  }).optional()
})

const idParam = z.object({ params: z.object({ id: z.string().min(8) }) })
const initSchema = z.object({ params: z.object({ id: z.string().min(8) }), body: z.object({ reason: z.string().optional() }) })
const statusSchema = z.object({ params: z.object({ id: z.string().min(8) }), body: z.object({ status: z.enum(['requested','approved','rejected','received','closed']) }) })
const auditListSchema = z.object({
  query: z.object({
    q: z.string().optional(),
    status: z.enum(['requested','approved','rejected','received','closed']).optional(),
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(200).optional()
  }).optional()
})

router.get('/', canManageReturns, validate(listSchema), listReturns)
router.get('/:id/details', canManageReturns, validate(idParam), getReturnDetails)
router.post('/:id/init', canManageReturns, validate(initSchema), initReturn)
router.patch('/:id/status', canManageReturns, validate(statusSchema), updateReturnStatus)
router.get('/audits', canManageReturns, validate(auditListSchema), listReturnAudits)

export default router