import { Router } from 'express'
import { requireAuth } from '../../middlewares/auth.js'
import { uploadReceipt } from '../../middlewares/upload.js'
import { uploadBankSlip } from '../controllers/payment.controller.js'

const router = Router()

// bank transfer slip upload
router.post('/bank/:orderId/slip', requireAuth, uploadReceipt.single('slip'), uploadBankSlip)

// (Optional) PayHere webhooks would go here later: router.post('/payhere/webhook', ...)

export default router
