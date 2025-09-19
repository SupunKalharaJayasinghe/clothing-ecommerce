import Product from '../models/Product.js'
import ApiError from '../../utils/ApiError.js'
import catchAsync from '../../utils/catchAsync.js'

// GET /api/favorites
export const listFavorites = catchAsync(async (req, res) => {
  const user = req.userDoc // set by auth middleware (see note below)
  await user.populate({
    path: 'favorites',
    options: { sort: { createdAt: -1 } }
  })

  res.json({
    ok: true,
    items: user.favorites.map(p => ({
      id: p._id,
      slug: p.slug,
      name: p.name,
      images: p.images,
      color: p.color,
      price: p.price,
      discountPercent: p.discountPercent,
      finalPrice: p.finalPrice ?? Math.round((p.price * (1 - (p.discountPercent||0)/100)) * 100) / 100,
      rating: p.rating,
      reviewsCount: p.reviewsCount,
      stock: p.stock,
      lowStock: p.lowStock,
      mainTags: p.mainTags,
      tags: p.tags
    }))
  })
})

// GET /api/favorites/ids
export const listFavoriteIds = catchAsync(async (req, res) => {
  const user = req.userDoc
  const ids = user.favorites.map(id => String(id))

  // also return slugs for convenience
  const slugDocs = await Product.find({ _id: { $in: ids } }).select('slug').lean()
  const slugs = slugDocs.map(d => d.slug)

  res.json({ ok: true, ids, slugs })
})

// POST /api/favorites/:slug
export const addFavoriteBySlug = catchAsync(async (req, res) => {
  const { slug } = req.params
  const product = await Product.findOne({ slug })
  if (!product) throw new ApiError(404, 'Product not found')

  const user = req.userDoc
  await user.updateOne({ $addToSet: { favorites: product._id } })

  res.status(201).json({ ok: true, favorited: true, slug })
})

// DELETE /api/favorites/:slug
export const removeFavoriteBySlug = catchAsync(async (req, res) => {
  const { slug } = req.params
  const product = await Product.findOne({ slug })
  if (!product) throw new ApiError(404, 'Product not found')

  const user = req.userDoc
  await user.updateOne({ $pull: { favorites: product._id } })

  res.json({ ok: true, favorited: false, slug })
})
