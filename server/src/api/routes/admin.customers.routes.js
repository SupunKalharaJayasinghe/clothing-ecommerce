import { Router } from 'express'
import { validate } from '../../middlewares/validate.js'
import { requireAdminAuth } from '../../middlewares/adminAuth.js'
import { requireAnyRole, requirePrimaryAdmin, ROLES } from '../../middlewares/roles.js'
import { z } from 'zod'
import { listCustomers, getCustomer, getCustomerDetails, createCustomer, updateCustomer, deleteCustomer } from '../controllers/admin.customers.controller.js'

const router = Router()
router.use(requireAdminAuth)

const canManageCustomers = requireAnyRole(ROLES.ADMIN, ROLES.USER_MANAGER)

const listSchema = z.object({ query: z.object({ q: z.string().optional(), page: z.coerce.number().min(1).optional(), limit: z.coerce.number().min(1).max(100).optional() }) })
const idParam = z.object({ params: z.object({ id: z.string() }) })
const createSchema = z.object({ body: z.object({ firstName: z.string().min(2).max(60), lastName: z.string().min(2).max(60), username: z.string().min(3).max(30).regex(/^[a-z0-9_.]+$/), email: z.string().email(), password: z.string().min(8), roles: z.array(z.string()).min(1).default(['user']) }) })
const updateSchema = z.object({ params: z.object({ id: z.string() }), body: z.object({ firstName: z.string().min(2).max(60).optional(), lastName: z.string().min(2).max(60).optional(), username: z.string().min(3).max(30).regex(/^[a-z0-9_.]+$/).optional(), email: z.string().email().optional(), password: z.string().min(8).optional(), roles: z.array(z.string()).min(1).optional() }) })

router.get('/', canManageCustomers, validate(listSchema), listCustomers)
router.get('/:id', canManageCustomers, validate(idParam), getCustomer)
router.get('/:id/details', canManageCustomers, validate(idParam), getCustomerDetails)
router.post('/', requirePrimaryAdmin, validate(createSchema), createCustomer)
router.patch('/:id', requirePrimaryAdmin, validate(updateSchema), updateCustomer)
router.delete('/:id', requirePrimaryAdmin, validate(idParam), deleteCustomer)

export default router
