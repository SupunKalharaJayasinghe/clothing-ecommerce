import { Router } from 'express'
import { requireAuth } from '../../middlewares/auth.js'
import { uploadReceipt } from '../../middlewares/upload.js'
import { uploadBankSlip, payhereWebhook } from '../controllers/payment.controller.js'
import { payhreCreatepayment } from '../controllers/payment.controller.js'

const router = Router()

// bank transfer slip upload
router.post('/bank/:orderId/slip', requireAuth, uploadReceipt.single('slip'), uploadBankSlip)

// PayHere webhook to finalize card payments
router.post('/payhere/webhook', payhereWebhook)
router.post ('/create-payment ',payhreCreatepayment) 

export default router
