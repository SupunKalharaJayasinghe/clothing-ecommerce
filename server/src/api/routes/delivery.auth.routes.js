import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../../middlewares/validate.js'
import { login, me, logout, register, verifyEmailOnLogin } from '../controllers/delivery.auth.controller.js'
import { requireDeliveryAuth } from '../../middlewares/deliveryAuth.js'

const router = Router()

const loginSchema = z.object({
  body: z.object({ identifier: z.string().min(1), password: z.string().min(1) })
})

const loginVerifySchema = z.object({
  body: z.object({ tmpToken: z.string().min(10), code: z.string().min(4) })
})

router.post('/login', validate(loginSchema), login)
router.post('/login/verify', validate(loginVerifySchema), verifyEmailOnLogin)

// Minimal registration schema: exactly 10 fields
const registerSchema = z.object({
  body: z.object({
    fullName: z.string().min(3),
    dob: z.coerce.date(),
    phone: z.string().min(6),
    email: z.string().email(),
    password: z.string().min(8),
    addressLine1: z.string().min(2),
    city: z.string().min(2),
    country: z.string().min(2),
    govIdNumber: z.string().min(3),
    vehicleType: z.enum(['bike','bicycle','motorbike','car','van']).optional()
  }).strict()
})
router.post('/register', validate(registerSchema), register)

router.get('/me', requireDeliveryAuth, me)
router.post('/logout', requireDeliveryAuth, logout)

export default router
