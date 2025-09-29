import { Router } from 'express'
import { validate } from '../../middlewares/validate.js'
import { requireAdminAuth } from '../../middlewares/adminAuth.js'
import { login, me, logout, verifyEmailOnLogin } from '../controllers/admin.auth.controller.js'
import { z } from 'zod'

const router = Router()

const loginSchema = z.object({
  body: z.object({
    identifier: z.string().min(1),
    password: z.string().min(1)
  })
})

const loginVerifySchema = z.object({
  body: z.object({
    tmpToken: z.string().min(10),
    code: z.string().min(4)
  })
})

router.post('/login', validate(loginSchema), login)
router.post('/login/verify', validate(loginVerifySchema), verifyEmailOnLogin)
router.get('/me', requireAdminAuth, me)
router.post('/logout', requireAdminAuth, logout)

export default router
