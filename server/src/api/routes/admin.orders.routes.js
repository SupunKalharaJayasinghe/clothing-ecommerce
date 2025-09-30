import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../../middlewares/validate.js'
import { requireAdminAuth } from '../../middlewares/adminAuth.js'
import { requireAnyRole, ROLES } from '../../middlewares/roles.js'
import { listOrders, getOrder, getOrderDetails, updateStatus, createOrder, deleteOrder } from '../controllers/admin.orders.controller.js'

const router = Router()
router.use(requireAdminAuth)

const canManageOrders = requireAnyRole(ROLES.ADMIN, ROLES.ORDER_MANAGER, ROLES.PAYMENT_MANAGER)

const listSchema = z.object({
  query: z.object({
    q: z.string().optional(),
    status: z.string().optional(),
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
  }).optional()
})

const idParam = z.object({ params: z.object({ id: z.string().min(8) }) })

const statusSchema = z.object({
  params: z.object({ id: z.string().min(8) }),
  body: z.object({
    status: z.string().min(2),
    reason: z.object({ code: z.string().min(1).optional(), detail: z.string().min(1).optional() }).optional(),
    evidence: z.object({
      scanRef: z.string().optional(),
      photoUrl: z.string().url().optional(),
      podPhotoUrl: z.string().url().optional(),
      signatureUrl: z.string().url().optional(),
      otp: z.string().min(4).optional()
    }).optional()
  }).passthrough()
})

router.get('/', canManageOrders, validate(listSchema), listOrders)
router.get('/:id', canManageOrders, validate(idParam), getOrder)
router.get('/:id/details', canManageOrders, validate(idParam), getOrderDetails)
router.patch('/:id/status', canManageOrders, validate(statusSchema), updateStatus)

// Create
const createSchema = z.object({
  body: z.object({
    userId: z.string().min(8),
    method: z.enum(['COD','CARD','BANK']),
    items: z.array(z.object({ slug: z.string().min(1), quantity: z.number().int().min(1).max(99) })).min(1),
    address: z.object({
      line1: z.string().min(3),
      city: z.string().min(2),
      country: z.string().min(2),
      phone: z.string().min(7)
    }).partial().optional(),
    addressId: z.string().min(8).optional()
  })
})
router.post('/', canManageOrders, validate(createSchema), createOrder)

// Delete
router.delete('/:id', canManageOrders, validate(idParam), deleteOrder)

export default router
