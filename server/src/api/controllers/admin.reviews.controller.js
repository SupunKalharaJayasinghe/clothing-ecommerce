import ApiError from '../../utils/ApiError.js'
import catchAsync from '../../utils/catchAsync.js'
import Review from '../models/Review.js'
import Product from '../models/Product.js'

export const listReviews = catchAsync(async (req, res) => {
  const { q = '', slug = '', page = 1, limit = 20 } = req.query

  const filters = []
  if (slug) {
    const p = await Product.findOne({ slug: String(slug).trim() }).select('_id').lean()
    filters.push(p ? { product: p._id } : { _id: null })
  }
  if (q) {
    const rx = new RegExp(String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    filters.push({ $or: [ { comment: rx } ] })
  }

  const where = filters.length ? { $and: filters } : {}
  const pageNum = Math.max(parseInt(page, 10) || 1, 1)
  const perPage = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100)
  const skip = (pageNum - 1) * perPage

  const [items, total] = await Promise.all([
    Review.find(where)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(perPage)
      .populate({ path: 'user', select: 'username firstName lastName' })
      .populate({ path: 'product', select: 'slug name' })
      .lean(),
    Review.countDocuments(where)
  ])

  const mapped = items.map(r => ({
    id: r._id,
    product: r.product ? { id: r.product._id, slug: r.product.slug, name: r.product.name } : null,
    user: r.user ? {
      id: r.user._id,
      name: (r.user.firstName || r.user.lastName)
        ? `${r.user.firstName || ''} ${r.user.lastName || ''}`.trim()
        : r.user.username
    } : null,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt
  }))

  res.json({ ok: true, items: mapped, page: pageNum, limit: perPage, total, hasMore: skip + items.length < total })
})

export const getReviewDetails = catchAsync(async (req, res) => {
  const { id } = req.params
  const review = await Review.findById(id)
    .populate({ path: 'user', select: 'username firstName lastName email' })
    .populate({ path: 'product', select: 'slug name price images' })
    .lean()
  if (!review) {
    throw new ApiError(404, 'Review not found')
  }
  
  // Include additional details for detailed report
  const reviewDetails = {
    ...review,
    customerName: review.user ? (
      review.user.firstName || review.user.lastName
        ? `${review.user.firstName || ''} ${review.user.lastName || ''}`.trim()
        : review.user.username
    ) : 'Anonymous',
    customerEmail: review.user?.email || 'N/A',
    productName: review.product?.name || 'N/A',
    productSlug: review.product?.slug || 'N/A',
    productPrice: review.product?.price || 0,
    rating: review.rating || 0,
    comment: review.comment || 'No comment'
  }
  
  res.json({ ok: true, review: reviewDetails })
})

export const deleteReview = catchAsync(async (req, res) => {
  const { id } = req.params
  const r = await Review.findById(id)
  if (!r) return res.json({ ok: true })
  const pid = r.product
  await r.deleteOne()
  await Review.recalcProductRating(pid)
  res.json({ ok: true })
})
