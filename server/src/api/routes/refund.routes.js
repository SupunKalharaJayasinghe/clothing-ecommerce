import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../../middlewares/validate.js'
import { requireAuth } from '../../middlewares/auth.js'
import { getMyRefunds, getRefundDetails, getMyRefundStats, requestRefund } from '../controllers/refund.controller.js'

const router = Router()
router.use(requireAuth)

const listSchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(100).optional()
  }).optional()
})

const idParam = z.object({ 
  params: z.object({ 
    id: z.string().min(8) 
  }) 
})

const requestSchema = z.object({
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

// Routes
router.get('/me', validate(listSchema), getMyRefunds)
router.get('/stats', getMyRefundStats)
router.get('/:id', validate(idParam), getRefundDetails)
router.post('/request', validate(requestSchema), requestRefund)

export default router
