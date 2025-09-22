import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../../middlewares/validate.js'
import { requireDeliveryAuth } from '../../middlewares/deliveryAuth.js'
import { listCodOrders, updateCodPayment, updateCodStatus } from '../controllers/delivery.cod.controller.js'

const router = Router()
router.use(requireDeliveryAuth)

const listSchema = z.object({
  query: z.object({ status: z.string().optional() }).optional()
})

const idParam = z.object({ params: z.object({ id: z.string().min(8) }) })

const paymentSchema = z.object({
  params: z.object({ id: z.string().min(8) }),
  body: z.object({ action: z.enum(['paid','failed']) })
})

const statusSchema = z.object({
  params: z.object({ id: z.string().min(8) }),
  body: z.object({ status: z.string().min(2) })
})

router.get('/', validate(listSchema), listCodOrders)
router.patch('/:id/payment', validate(paymentSchema), updateCodPayment)
router.patch('/:id/status', validate(statusSchema), updateCodStatus)

export default router
