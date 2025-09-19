import { Router } from 'express'
import { requireAuth } from '../../middlewares/auth.js'
import { validate } from '../../middlewares/validate.js'
import { placeOrderSchema, getOrderSchema } from '../validators/order.validator.js'
import { placeOrder, listMyOrders, getOrder } from '../controllers/order.controller.js'

const router = Router()

router.post('/', requireAuth, validate(placeOrderSchema), placeOrder)
router.get('/me', requireAuth, listMyOrders)
router.get('/:id', requireAuth, validate(getOrderSchema), getOrder)

export default router
