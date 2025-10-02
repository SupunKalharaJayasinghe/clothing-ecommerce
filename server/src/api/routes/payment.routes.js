import { Router } from 'express'
import { requireAuth } from '../../middlewares/auth.js'
import { uploadReceipt } from '../../middlewares/upload.js'
import { uploadBankSlip, payhereWebhook, payhereStatus } from '../controllers/payment.controller.js'

const router = Router()

// bank transfer slip upload
router.post('/bank/:orderId/slip', requireAuth, uploadReceipt.single('slip'), uploadBankSlip)

// PayHere webhook to finalize card payments
router.post('/payhere/webhook', payhereWebhook)

// PayHere status check (auth required)
router.get('/payhere/status/:id', requireAuth, payhereStatus)

export default router
