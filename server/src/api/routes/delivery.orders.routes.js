import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../../middlewares/validate.js'
import { requireDeliveryAuth } from '../../middlewares/deliveryAuth.js'
import { listDeliveryOrders, updateDeliveryOrderStatus } from '../controllers/delivery.orders.controller.js'

const router = Router()
router.use(requireDeliveryAuth)

const listSchema = z.object({
  query: z.object({
    // Accept any status string (lowercase/uppercase/aliases); controller will map it
    status: z.string().optional(),
    method: z.enum(['COD','CARD','BANK']).optional()
  }).optional()
})

const statusSchema = z.object({
  params: z.object({ id: z.string().min(8) }),
  body: z.object({
    // Accept any status string; controller maps and validates
    status: z.string().min(2),
    // Optional metadata only (no validation requirement for now)
    reason: z.object({ code: z.string().min(1).optional(), detail: z.string().min(1).optional() }).optional(),
    evidence: z.object({ podPhotoUrl: z.string().url().optional(), signatureUrl: z.string().url().optional(), otp: z.string().min(4).optional() }).optional()
  })
})

router.get('/', validate(listSchema), listDeliveryOrders)
router.patch('/:id/status', validate(statusSchema), updateDeliveryOrderStatus)

export default router
