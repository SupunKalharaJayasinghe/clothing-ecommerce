import Review from '../models/Review.js'
import Product from '../models/Product.js'
import ApiError from '../../utils/ApiError.js'
import catchAsync from '../../utils/catchAsync.js'

// GET /api/products/:slug/reviews
export const listReviews = catchAsync(async (req, res) => {
  const { slug } = req.params
  const product = await Product.findOne({ slug }).lean()
  if (!product) throw new ApiError(404, 'Product not found')

  const page = Math.max(parseInt(req.query.page || '1', 10), 1)
  const limit = Math.min(Math.max(parseInt(req.query.limit || '5', 10), 1), 50)
  const skip = (page - 1) * limit

  const [items, total] = await Promise.all([
    Review.find({ product: product._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: 'user', select: 'username firstName lastName' })
      .lean(),
    Review.countDocuments({ product: product._id })
  ])

  res.json({
    ok: true,
    items: items.map(r => ({
      id: r._id,
      user: {
        id: r.user?._id,
        name: (r.user?.firstName || r.user?.lastName) ? `${r.user?.firstName || ''} ${r.user?.lastName || ''}`.trim() : r.user?.username || 'User'
      },
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    })),
    page, limit, total
  })
})

// GET /api/products/:slug/reviews/me
export const getMyReview = catchAsync(async (req, res) => {
  const { slug } = req.params
  const product = await Product.findOne({ slug }).lean()
  if (!product) throw new ApiError(404, 'Product not found')

  const r = await Review.findOne({ product: product._id, user: req.user.sub }).lean()
  res.json({
    ok: true,
    review: r ? {
      id: r._id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    } : null
  })
})

// POST /api/products/:slug/reviews  (upsert)
export const upsertMyReview = catchAsync(async (req, res) => {
  const { slug } = req.params
  const { rating, comment } = req.body
  const product = await Product.findOne({ slug })
  if (!product) throw new ApiError(404, 'Product not found')

  const review = await Review.findOneAndUpdate(
    { product: product._id, user: req.user.sub },
    { $set: { rating, comment } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  )

  await Review.recalcProductRating(product._id)

  res.status(201).json({
    ok: true,
    review: {
      id: review._id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt
    }
  })
})

// DELETE /api/products/:slug/reviews/me
export const deleteMyReview = catchAsync(async (req, res) => {
  const { slug } = req.params
  const product = await Product.findOne({ slug })
  if (!product) throw new ApiError(404, 'Product not found')

  await Review.findOneAndDelete({ product: product._id, user: req.user.sub })
  await Review.recalcProductRating(product._id)

  res.json({ ok: true })
})
