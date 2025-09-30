import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../../middlewares/validate.js'
import { requireAdminAuth } from '../../middlewares/adminAuth.js'
import { requirePrimaryAdminOrAnyRole, ROLES } from '../../middlewares/roles.js'
import { listProducts, getProduct, createProduct, updateProduct, deleteProduct, getProductDetails } from '../controllers/admin.products.controller.js'

const router = Router()
router.use(requireAdminAuth)

const canManageProducts = requirePrimaryAdminOrAnyRole(ROLES.PRODUCT_MANAGER)

const listSchema = z.object({
  query: z.object({
    q: z.string().optional(),
    category: z.enum(['men','women','kids']).optional(),
    categoryId: z.string().min(8).optional(),
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(100).optional()
  })
})

const idParam = z.object({ params: z.object({ id: z.string().min(8) }) })

const createSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(200),
    images: z.array(z.string().min(1)).min(1).max(10),
    color: z.string().min(1),
    description: z.string().min(10),
    price: z.coerce.number().min(0),
    discountPercent: z.coerce.number().min(0).max(100).optional().default(0),
    stock: z.coerce.number().int().min(0).optional().default(0),
    lowStockThreshold: z.coerce.number().int().min(0).optional().default(5),
    tags: z.array(z.string()).optional().default([]),
    mainTags: z.array(z.enum(['discount','new','limited','bestseller','featured'])).optional().default([]),
    category: z.enum(['men','women','kids']).optional(),
    categoryId: z.string().min(8).optional(),
    metaTitle: z.string().optional(),
    metaDescription: z.string().optional()
  })
})

const updateSchema = z.object({
  params: z.object({ id: z.string().min(8) }),
  body: z.object({
    name: z.string().min(2).max(200).optional(),
    images: z.array(z.string().min(1)).min(1).max(10).optional(),
    color: z.string().min(1).optional(),
    description: z.string().min(10).optional(),
    price: z.coerce.number().min(0).optional(),
    discountPercent: z.coerce.number().min(0).max(100).optional(),
    stock: z.coerce.number().int().min(0).optional(),
    lowStockThreshold: z.coerce.number().int().min(0).optional(),
    tags: z.array(z.string()).optional(),
    mainTags: z.array(z.enum(['discount','new','limited','bestseller','featured'])).optional(),
    category: z.enum(['men','women','kids']).optional(),
    categoryId: z.string().min(8).optional(),
    metaTitle: z.string().optional(),
    metaDescription: z.string().optional()
  })
})

router.get('/', canManageProducts, validate(listSchema), listProducts)
router.get('/:id', canManageProducts, validate(idParam), getProduct)
router.get('/:id/details', canManageProducts, validate(idParam), getProductDetails)
router.post('/', canManageProducts, validate(createSchema), createProduct)
router.patch('/:id', canManageProducts, validate(updateSchema), updateProduct)
router.delete('/:id', canManageProducts, validate(idParam), deleteProduct)

export default router
