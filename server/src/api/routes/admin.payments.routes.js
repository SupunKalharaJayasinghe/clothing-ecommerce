import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../../middlewares/validate.js'
import { requireAdminAuth } from '../../middlewares/adminAuth.js'
import { requireAnyRole, ROLES } from '../../middlewares/roles.js'
import { listPayments, verifyBankSlip, updatePaymentStatus, listTransactions, getPaymentDetails } from '../controllers/admin.payments.controller.js'

const router = Router()
router.use(requireAdminAuth)

const canManagePayments = requireAnyRole(ROLES.ADMIN, ROLES.PAYMENT_MANAGER)

const listSchema = z.object({
  query: z.object({
    q: z.string().optional(),
    method: z.enum(['COD','CARD','BANK']).optional(),
    status: z.enum(['UNPAID','PENDING','AUTHORIZED','PAID','FAILED','REFUND_PENDING','REFUNDED']).optional(),
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
  }).optional()
})

const idParam = z.object({ params: z.object({ id: z.string().min(8) }) })
const pagedQuery = z.object({ query: z.object({ page: z.coerce.number().min(1).optional(), limit: z.coerce.number().min(1).max(200).optional() }).optional() })

const statusSchema = z.object({
  params: z.object({ id: z.string().min(8) }),
  body: z.object({ status: z.enum(['UNPAID','PENDING','AUTHORIZED','PAID','FAILED','REFUND_PENDING','REFUNDED']) })
})

router.get('/', canManagePayments, validate(listSchema), listPayments)
router.get('/:id/details', canManagePayments, validate(idParam), getPaymentDetails)
router.post('/bank/:id/verify', canManagePayments, validate(idParam), verifyBankSlip)
router.patch('/:id/status', canManagePayments, validate(statusSchema), updatePaymentStatus)
router.get('/:id/transactions', canManagePayments, validate(idParam.merge(pagedQuery)), listTransactions)

export default router