import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../../middlewares/validate.js'
import { requireAdminAuth } from '../../middlewares/adminAuth.js'
import { requireAnyRole, ROLES } from '../../middlewares/roles.js'
import { listDelivery, getDelivery, getDeliveryDetails, createDelivery, updateDelivery, deleteDelivery } from '../controllers/admin.delivery.controller.js'

const router = Router()
router.use(requireAdminAuth)

const canManage = requireAnyRole(ROLES.ADMIN, ROLES.ORDER_MANAGER, ROLES.PAYMENT_MANAGER)

const listSchema = z.object({
  query: z.object({ q: z.string().optional(), active: z.string().optional(), page: z.coerce.number().min(1).optional(), limit: z.coerce.number().min(1).max(100).optional() }).optional()
})

const idParam = z.object({ params: z.object({ id: z.string().min(8) }) })

// Minimal create/update schemas: exactly the 10 fields (password optional on update)
const createSchema = z.object({
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

const updateSchema = z.object({
  params: z.object({ id: z.string().min(8) }),
  body: z.object({
    fullName: z.string().min(3).optional(),
    dob: z.coerce.date().optional(),
    phone: z.string().min(6).optional(),
    email: z.string().email().optional(),
    password: z.string().min(8).optional(),
    addressLine1: z.string().min(2).optional(),
    city: z.string().min(2).optional(),
    country: z.string().min(2).optional(),
    govIdNumber: z.string().min(3).optional(),
    vehicleType: z.enum(['bike','bicycle','motorbike','car','van']).optional()
  }).strict()
})

router.get('/', canManage, validate(listSchema), listDelivery)
router.get('/:id', canManage, validate(idParam), getDelivery)
router.get('/:id/details', canManage, validate(idParam), getDeliveryDetails)
router.post('/', canManage, validate(createSchema), createDelivery)
router.patch('/:id', canManage, validate(updateSchema), updateDelivery)
router.delete('/:id', canManage, validate(idParam), deleteDelivery)

export default router
