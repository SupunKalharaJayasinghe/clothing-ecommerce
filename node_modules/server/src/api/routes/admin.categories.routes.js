import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../../middlewares/validate.js'
import { requireAdminAuth } from '../../middlewares/adminAuth.js'
import { requirePrimaryAdminOrAnyRole, ROLES } from '../../middlewares/roles.js'
import { listCategories, getCategory, createCategory, updateCategory, deleteCategory } from '../controllers/admin.categories.controller.js'

const router = Router()
router.use(requireAdminAuth)

const canManageProducts = requirePrimaryAdminOrAnyRole(ROLES.PRODUCT_MANAGER)

const listSchema = z.object({
  query: z.object({
    q: z.string().optional(),
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(200).optional()
  }).optional()
})

const idParam = z.object({ params: z.object({ id: z.string().min(8) }) })

const createSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(120),
    slug: z.string().min(2).max(140).optional(),
    parent: z.string().min(8).nullable().optional(),
    sortOrder: z.coerce.number().int().min(0).optional().default(0),
    active: z.boolean().optional().default(true)
  })
})

const updateSchema = z.object({
  params: z.object({ id: z.string().min(8) }),
  body: z.object({
    name: z.string().min(2).max(120).optional(),
    slug: z.string().min(2).max(140).optional(),
    parent: z.string().min(8).nullable().optional(),
    sortOrder: z.coerce.number().int().min(0).optional(),
    active: z.boolean().optional()
  })
})

router.get('/', canManageProducts, validate(listSchema), listCategories)
router.get('/:id', canManageProducts, validate(idParam), getCategory)
router.post('/', canManageProducts, validate(createSchema), createCategory)
router.patch('/:id', canManageProducts, validate(updateSchema), updateCategory)
router.delete('/:id', canManageProducts, validate(idParam), deleteCategory)

export default router
