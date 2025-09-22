import { Router } from 'express'
import { requireAuth } from '../../middlewares/auth.js'
import { requireAnyRole, ROLES } from '../../middlewares/roles.js'
import { validate } from '../../middlewares/validate.js'
import { listUsers, getUser, createUser, updateUser, deleteUser } from '../controllers/admin.controller.js'
import { listUsersSchema, createUserSchema, updateUserSchema, userIdParamSchema } from '../validators/admin.validator.js'

const router = Router()
router.use(requireAuth)

// User management (main admin or user manager)
const canManageUsers = requireAnyRole(ROLES.ADMIN, ROLES.USER_MANAGER)
router.get('/users', canManageUsers, validate(listUsersSchema), listUsers)
router.get('/users/:id', canManageUsers, validate(userIdParamSchema), getUser)
router.post('/users', canManageUsers, validate(createUserSchema), createUser)
router.patch('/users/:id', canManageUsers, validate(updateUserSchema), updateUser)
router.delete('/users/:id', canManageUsers, validate(userIdParamSchema), deleteUser)

export default router
