import { Router } from 'express'
import { requireAuth } from '../../middlewares/auth.js'
import { uploadReceipt } from '../../middlewares/upload.js'
import { uploadBankSlip, payhereWebhook, createPayherePayment } from '../controllers/payment.controller.js'

const router = Router()

// bank transfer slip upload
router.post('/bank/:orderId/slip', requireAuth, uploadReceipt.single('slip'), uploadBankSlip)

// PayHere webhook to finalize card payments
router.post('/payhere/webhook', payhereWebhook)

// PayHere create: generate hash and params (per guideline) for onsite popup
router.post('/payhere/create', requireAuth, createPayherePayment)

export default router
