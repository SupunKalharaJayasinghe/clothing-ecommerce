import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../../middlewares/validate.js'
import { requireAuth } from '../../middlewares/auth.js'
import { getMyRefunds, getRefundDetails, getMyRefundStats } from '../controllers/refund.controller.js'

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

// Routes
router.get('/me', validate(listSchema), getMyRefunds)
router.get('/stats', getMyRefundStats)
router.get('/:id', validate(idParam), getRefundDetails)

export default router
