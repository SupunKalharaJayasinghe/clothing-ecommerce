import { Router } from 'express'
import { validate } from '../../middlewares/validate.js'
import { requireAdminAuth } from '../../middlewares/adminAuth.js'
import { requireAnyRole, ROLES, requirePrimaryAdmin } from '../../middlewares/roles.js'
import { z } from 'zod'
import { listAdmins, getAdmin, createAdmin, updateAdmin, deleteAdmin, initiateCreateAdmin, verifyCreateAdmin } from '../controllers/admin.admins.controller.js'

const router = Router()
router.use(requireAdminAuth)

const canManageAdmins = requireAnyRole(ROLES.ADMIN, ROLES.USER_MANAGER)

const listSchema = z.object({ query: z.object({ q: z.string().optional(), role: z.string().optional(), page: z.coerce.number().min(1).optional(), limit: z.coerce.number().min(1).max(100).optional() }) })
const idParam = z.object({ params: z.object({ id: z.string() }) })
const createSchema = z.object({ body: z.object({ firstName: z.string().min(2).max(60), lastName: z.string().min(2).max(60), username: z.string().min(3).max(30).regex(/^[a-z0-9_.]+$/), email: z.string().email(), password: z.string().min(8), roles: z.array(z.string()).min(1).default(['user_manager']) }) })
const createVerifySchema = z.object({ body: z.object({
  tmpToken: z.string().min(10),
  code: z.string().regex(/^\d{6}$/, 'Verification code must be 6 digits'),
  firstName: z.string().min(2).max(60),
  lastName: z.string().min(2).max(60),
  username: z.string().min(3).max(30).regex(/^[a-z0-9_.]+$/),
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  roles: z.array(z.string()).min(1).default(['user_manager'])
}) })
const updateSchema = z.object({ params: z.object({ id: z.string() }), body: z.object({ firstName: z.string().min(2).max(60).optional(), lastName: z.string().min(2).max(60).optional(), username: z.string().min(3).max(30).regex(/^[a-z0-9_.]+$/).optional(), email: z.string().email().optional(), password: z.string().min(8).optional(), roles: z.array(z.string()).min(1).optional() }) })

router.get('/', canManageAdmins, validate(listSchema), listAdmins)
router.get('/:id', canManageAdmins, validate(idParam), getAdmin)
// Enforce OTP flow for creation: primary admin must initiate and verify
router.post('/create/initiate', requirePrimaryAdmin, initiateCreateAdmin)
router.post('/create/verify', requirePrimaryAdmin, validate(createVerifySchema), verifyCreateAdmin)
// Direct create is disabled and will return 400 instructing to use OTP flow
router.post('/', canManageAdmins, validate(createSchema), createAdmin)
router.patch('/:id', canManageAdmins, validate(updateSchema), updateAdmin)
router.delete('/:id', canManageAdmins, validate(idParam), deleteAdmin)

export default router
