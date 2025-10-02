import { Router } from 'express'
import { initPayHere, payHereWebhook, retrievePayment } from '../controllers/payments.controller.js'

const router = Router()

// Client calls this to get a ready-to-submit PayHere form
router.post('/payhere/init', initPayHere)

// PayHere IPN (Instant Payment Notification) hits this
router.post('/payhere/webhook', payHereWebhook)

// Optional: Admin/back-office lookup via Payment Retrieval API
router.post('/payhere/retrieve', retrievePayment)

export default router
