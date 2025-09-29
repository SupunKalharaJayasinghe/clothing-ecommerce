import { Router } from 'express'
import { requireAdminAuth } from '../../middlewares/adminAuth.js'
import { getAdminStats } from '../controllers/admin.stats.controller.js'

const router = Router()
router.use(requireAdminAuth)

// Any authenticated admin can read system stats for overview
router.get('/', getAdminStats)

export default router
