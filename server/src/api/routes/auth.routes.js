import { Router } from 'express'
import { register, login, me, logout } from '../controllers/auth.controller.js'
import { requireAuth } from '../../middlewares/auth.js'

const router = Router()
router.post('/register', register)
router.post('/login', login)
router.get('/me', requireAuth, me)
router.post('/logout', requireAuth, logout)

export default router
