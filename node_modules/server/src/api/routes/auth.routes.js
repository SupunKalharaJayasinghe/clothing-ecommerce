import { Router } from 'express'
import { register, login, me, logout } from '../controllers/auth.controller.js'
import { requireAuth } from '../../middlewares/auth.js'
import { validate } from '../../middlewares/validate.js'
import { registerSchema, loginSchema } from '../validators/auth.validator.js'

const router = Router()

router.post('/register', validate(registerSchema), register)
router.post('/login', validate(loginSchema), login)
router.get('/me', requireAuth, me)
router.post('/logout', requireAuth, logout)

export default router
