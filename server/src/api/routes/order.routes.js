import { Router } from 'express'
import { requireAuth } from '../../middlewares/auth.js'
import { validate } from '../../middlewares/validate.js'
import { placeOrderSchema, getOrderSchema, cancelOrderSchema, requestReturnSchema } from '../validators/order.validator.js'
import { placeOrder, listMyOrders, getOrder, cancelMyOrder, requestReturn } from '../controllers/order.controller.js'
import { uploadReturns } from '../../middlewares/upload.js'

const router = Router()

router.post('/', requireAuth, validate(placeOrderSchema), placeOrder)
router.get('/me', requireAuth, listMyOrders)
router.get('/:id', requireAuth, validate(getOrderSchema), getOrder)
router.patch('/:id/cancel', requireAuth, validate(cancelOrderSchema), cancelMyOrder)
router.post('/:id/return-request', requireAuth, uploadReturns.array('photos', 6), validate(requestReturnSchema), requestReturn)

export default router
