import { Router } from 'express'
import { register, login, me, logout, verify2FAOnLogin, forgotPassword, resetPassword, verifyEmailOnRegister, verifyEmailOnLogin, chooseLoginMethod, resendEmailLoginCode } from '../controllers/auth.controller.js'
import { requireAuth } from '../../middlewares/auth.js'
import { validate } from '../../middlewares/validate.js'
import { registerSchema, loginSchema, twoFAVerifySchema, forgotPasswordSchema, resetPasswordSchema, emailVerifySchema, loginVerifySchema, loginMethodSchema, loginResendSchema } from '../validators/auth.validator.js'

const router = Router()

router.post('/register', validate(registerSchema), register)
router.post('/login', validate(loginSchema), login)
router.post('/2fa/verify', validate(twoFAVerifySchema), verify2FAOnLogin)
router.post('/login/method', validate(loginMethodSchema), chooseLoginMethod)
// email verification flows
router.post('/email/verify', validate(emailVerifySchema), verifyEmailOnRegister)
router.post('/login/verify', validate(loginVerifySchema), verifyEmailOnLogin)
router.post('/login/resend', validate(loginResendSchema), resendEmailLoginCode)
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword)
router.post('/reset-password', validate(resetPasswordSchema), resetPassword)

router.get('/me', requireAuth, me)
router.post('/logout', requireAuth, logout)

export default router
