import { Router } from 'express'
import { requireAuth } from '../../middlewares/auth.js'
import { uploadReceipt } from '../../middlewares/upload.js'
import { uploadBankSlip, payhereWebhook, payhereCreate } from '../controllers/payment.controller.js'

const router = Router()

// bank transfer slip upload
router.post('/bank/:orderId/slip', requireAuth, uploadReceipt.single('slip'), uploadBankSlip)

// PayHere onsite: create payment payload & hash
router.post('/payhere/create', requireAuth, payhereCreate)

// PayHere webhook to finalize card payments
router.post('/payhere/webhook', payhereWebhook)

export default router
