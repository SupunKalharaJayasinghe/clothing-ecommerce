import { Router } from 'express'
import {
  listProducts,
  getProductBySlug,
  getHighlights,
  suggestProducts
} from '../controllers/product.controller.js'
import { requireAuth } from '../../middlewares/auth.js'
import { validate } from '../../middlewares/validate.js'
import { microCache } from '../../middlewares/cache.js'
import {
  reviewCreateSchema,
  reviewUpdateSchema,
  reviewDeleteSchema,
  reviewsListSchema,
  myReviewsListSchema
} from '../validators/review.validator.js'
import {
  listReviews,
  listMyReviews,
  createReview,
  updateMyReviewById,
  deleteMyReviewById
} from '../controllers/review.controller.js'
import {
  listProductsSchema,
  productSlugSchema,
  highlightsSchema,
  suggestSchema
} from '../validators/product.validator.js'

const router = Router()

// home-page helpers
router.get('/highlights', microCache(60), validate(highlightsSchema), getHighlights)
router.get('/suggest', microCache(15), validate(suggestSchema), suggestProducts)

// products listing & details
router.get('/', microCache(20), listProducts)
router.get('/:slug', microCache(60), validate(productSlugSchema), getProductBySlug)

// reviews (public read)
router.get('/:slug/reviews', validate(reviewsListSchema), listReviews)

// my reviews (auth)
router.get('/:slug/reviews/me', requireAuth, validate(myReviewsListSchema), listMyReviews)

// create new review (auth)
router.post('/:slug/reviews', requireAuth, validate(reviewCreateSchema), createReview)

// update/delete specific review (auth)
router.patch('/:slug/reviews/:id', requireAuth, validate(reviewUpdateSchema), updateMyReviewById)
router.delete('/:slug/reviews/:id', requireAuth, validate(reviewDeleteSchema), deleteMyReviewById)

export default router
