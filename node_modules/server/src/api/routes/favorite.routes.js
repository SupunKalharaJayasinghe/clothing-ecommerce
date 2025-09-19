import { Router } from 'express'
import { requireAuth } from '../../middlewares/auth.js'
import { validate } from '../../middlewares/validate.js'
import { slugParamSchema } from '../validators/favorite.validator.js'
import {
  listFavorites,
  listFavoriteIds,
  addFavoriteBySlug,
  removeFavoriteBySlug
} from '../controllers/favorite.controller.js'

const router = Router()

// all favorites endpoints require auth
router.use(requireAuth)

// list favorites (full product docs)
router.get('/', listFavorites)

// lightweight ids/slugs for quick UI highlight
router.get('/ids', listFavoriteIds)

// add/remove by slug
router.post('/:slug', validate(slugParamSchema), addFavoriteBySlug)
router.delete('/:slug', validate(slugParamSchema), removeFavoriteBySlug)

export default router
