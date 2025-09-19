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
        name: (r.user?.firstName || r.user?.lastName)
          ? `${r.user?.firstName || ''} ${r.user?.lastName || ''}`.trim()
          : r.user?.username || 'User'
      },
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    })),
    page, limit, total
  })
})

// GET /api/products/:slug/reviews/me  (list my reviews)
export const listMyReviews = catchAsync(async (req, res) => {
  const { slug } = req.params
  const product = await Product.findOne({ slug }).lean()
  if (!product) throw new ApiError(404, 'Product not found')

  const page = Math.max(parseInt(req.query.page || '1', 10), 1)
  const limit = Math.min(Math.max(parseInt(req.query.limit || '10', 10), 1), 50)
  const skip = (page - 1) * limit

  const userId = req.user.sub

  const [items, total] = await Promise.all([
    Review.find({ product: product._id, user: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Review.countDocuments({ product: product._id, user: userId })
  ])

  res.json({
    ok: true,
    items: items.map(r => ({
      id: r._id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    })),
    page, limit, total
  })
})

// POST /api/products/:slug/reviews  (create NEW review; max 5 per user/product)
export const createReview = catchAsync(async (req, res) => {
  const { slug } = req.params
  const { rating, comment } = req.body
  const product = await Product.findOne({ slug })
  if (!product) throw new ApiError(404, 'Product not found')

  const userId = req.user.sub
  const count = await Review.countDocuments({ product: product._id, user: userId })
  if (count >= 5) throw new ApiError(400, 'You have reached the maximum of 5 reviews for this product')

  const review = await Review.create({
    product: product._id,
    user: userId,
    rating,
    comment
  })

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

// PATCH /api/products/:slug/reviews/:id  (update own review)
export const updateMyReviewById = catchAsync(async (req, res) => {
  const { slug, id } = req.params
  const { rating, comment } = req.body
  const product = await Product.findOne({ slug })
  if (!product) throw new ApiError(404, 'Product not found')

  const userId = req.user.sub
  const review = await Review.findOneAndUpdate(
    { _id: id, product: product._id, user: userId },
    { $set: { rating, comment } },
    { new: true, runValidators: true }
  )

  if (!review) throw new ApiError(404, 'Review not found')

  await Review.recalcProductRating(product._id)

  res.json({
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

// DELETE /api/products/:slug/reviews/:id  (delete own review)
export const deleteMyReviewById = catchAsync(async (req, res) => {
  const { slug, id } = req.params
  const product = await Product.findOne({ slug })
  if (!product) throw new ApiError(404, 'Product not found')

  const userId = req.user.sub
  const deleted = await Review.findOneAndDelete({ _id: id, product: product._id, user: userId })
  if (!deleted) throw new ApiError(404, 'Review not found')

  await Review.recalcProductRating(product._id)

  res.json({ ok: true })
})
