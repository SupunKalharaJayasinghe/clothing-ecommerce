import { z } from 'zod'
import { ROLES } from '../../middlewares/roles.js'

const roleEnum = z.enum([
  ROLES.ADMIN,
  ROLES.USER_MANAGER,
  ROLES.PRODUCT_MANAGER,
  ROLES.ORDER_MANAGER,
  ROLES.PAYMENT_MANAGER,
  ROLES.REFUND_MANAGER,
  ROLES.RETURN_MANAGER,
  ROLES.REVIEW_MANAGER,
  'user'
])

export const listUsersSchema = z.object({
  query: z.object({
    q: z.string().trim().optional(),
    role: z.string().trim().optional(),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20)
  })
})

export const createUserSchema = z.object({
  body: z.object({
    firstName: z.string().min(2).max(60),
    lastName: z.string().min(2).max(60),
    username: z.string().min(3).max(30).regex(/^[a-z0-9_.]+$/),
    email: z.string().email(),
    password: z.string().min(8),
    roles: z.array(roleEnum).min(1).default(['user'])
  })
})

export const updateUserSchema = z.object({
  params: z.object({ id: z.string() }),
  body: z.object({
    firstName: z.string().min(2).max(60).optional(),
    lastName: z.string().min(2).max(60).optional(),
    username: z.string().min(3).max(30).regex(/^[a-z0-9_.]+$/).optional(),
    email: z.string().email().optional(),
    password: z.string().min(8).optional(),
    roles: z.array(roleEnum).min(1).optional()
  })
})

export const userIdParamSchema = z.object({
  params: z.object({ id: z.string() })
})
