import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../../middlewares/validate.js'
import { requireAdminAuth } from '../../middlewares/adminAuth.js'
import { requireAnyRole, ROLES } from '../../middlewares/roles.js'
import { 
  listRefunds, 
  listRefundAudits, 
  getRefundDetails, 
  createRefund, 
  approveRefund, 
  processRefund, 
  rejectRefund, 
  getRefundStats 
} from '../controllers/admin.refunds.controller.js'

const router = Router()
router.use(requireAdminAuth)

const canManageRefunds = requireAnyRole(ROLES.ADMIN, ROLES.REFUND_MANAGER)

const listSchema = z.object({
  query: z.object({
    q: z.string().optional(),
    method: z.enum(['COD','CARD','BANK']).optional(),
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
  }).optional()
})

const idParam = z.object({ params: z.object({ id: z.string().min(8) }) })

const createRefundSchema = z.object({
  body: z.object({
    orderId: z.string().min(8),
    amount: z.number().min(0),
    reason: z.string().optional(),
    refundMethod: z.enum(['ORIGINAL_PAYMENT', 'BANK_TRANSFER', 'STORE_CREDIT']).optional(),
    bankDetails: z.object({
      accountName: z.string().optional(),
      accountNumber: z.string().optional(),
      bankName: z.string().optional(),
      routingNumber: z.string().optional()
    }).optional()
  })
})

const approveRefundSchema = z.object({
  params: z.object({ id: z.string().min(8) }),
  body: z.object({
    adminNotes: z.string().optional()
  })
})

const processRefundSchema = z.object({
  params: z.object({ id: z.string().min(8) }),
  body: z.object({
    gatewayRefundId: z.string().optional(),
    gatewayResponse: z.any().optional(),
    adminNotes: z.string().optional()
  })
})

const rejectRefundSchema = z.object({
  params: z.object({ id: z.string().min(8) }),
  body: z.object({
    reason: z.string().min(1),
    adminNotes: z.string().optional()
  })
})

const statsSchema = z.object({
  query: z.object({
    period: z.enum(['7d', '30d', '90d', '1y']).optional()
  }).optional()
})

// Routes
router.get('/', canManageRefunds, validate(listSchema), listRefunds)
router.get('/stats', canManageRefunds, validate(statsSchema), getRefundStats)
router.get('/:id/details', canManageRefunds, validate(idParam), getRefundDetails)

router.post('/', canManageRefunds, validate(createRefundSchema), createRefund)
router.patch('/:id/approve', canManageRefunds, validate(approveRefundSchema), approveRefund)
router.patch('/:id/process', canManageRefunds, validate(processRefundSchema), processRefund)
router.patch('/:id/reject', canManageRefunds, validate(rejectRefundSchema), rejectRefund)

export default router