import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../../middlewares/validate.js'
import { requireAdminAuth } from '../../middlewares/adminAuth.js'
import { requireAnyRole, ROLES } from '../../middlewares/roles.js'
import { listReviews, deleteReview, getReviewDetails } from '../controllers/admin.reviews.controller.js'

const router = Router()
router.use(requireAdminAuth)

const canModerateReviews = requireAnyRole(ROLES.ADMIN, ROLES.REVIEW_MANAGER)

const listSchema = z.object({
  query: z.object({
    q: z.string().optional(),
    slug: z.string().optional(),
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(100).optional()
  }).optional()
})

const idParam = z.object({ params: z.object({ id: z.string().min(8) }) })

router.get('/', canModerateReviews, validate(listSchema), listReviews)
router.get('/:id/details', canModerateReviews, validate(idParam), getReviewDetails)
router.delete('/:id', canModerateReviews, validate(idParam), deleteReview)

export default router