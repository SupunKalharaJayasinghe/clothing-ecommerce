import { Router } from 'express'
import { requireAuth } from '../../middlewares/auth.js'
import { validate } from '../../middlewares/validate.js'
import { placeOrderSchema, getOrderSchema, cancelOrderSchema } from '../validators/order.validator.js'
import { placeOrder, listMyOrders, getOrder, cancelMyOrder } from '../controllers/order.controller.js'

const router = Router()

router.post('/', requireAuth, validate(placeOrderSchema), placeOrder)
router.get('/me', requireAuth, listMyOrders)
router.get('/:id', requireAuth, validate(getOrderSchema), getOrder)
router.patch('/:id/cancel', requireAuth, validate(cancelOrderSchema), cancelMyOrder)

export default router
