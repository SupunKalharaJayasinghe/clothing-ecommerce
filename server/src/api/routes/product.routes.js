import { Router } from 'express'
import { listProducts, getProductBySlug } from '../controllers/product.controller.js'
import { requireAuth } from '../../middlewares/auth.js'
import { validate } from '../../middlewares/validate.js'
import {
  reviewUpsertSchema,
  reviewsListSchema,
  reviewMeParamSchema
} from '../validators/review.validator.js'
import {
  listReviews,
  getMyReview,
  upsertMyReview,
  deleteMyReview
} from '../controllers/review.controller.js'

const router = Router()

// products listing & details
router.get('/', listProducts)
router.get('/:slug', getProductBySlug)

// reviews (public read)
router.get('/:slug/reviews', validate(reviewsListSchema), listReviews)

// my review (auth + validated params)
router.get('/:slug/reviews/me', validate(reviewMeParamSchema), requireAuth, getMyReview)
router.post('/:slug/reviews', validate(reviewUpsertSchema), requireAuth, upsertMyReview)
router.delete('/:slug/reviews/me', validate(reviewMeParamSchema), requireAuth, deleteMyReview)

export default router
