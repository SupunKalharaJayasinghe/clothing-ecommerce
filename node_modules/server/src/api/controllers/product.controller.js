import Product from '../models/Product.js'
import catchAsync from '../../utils/catchAsync.js'
import ApiError from '../../utils/ApiError.js'

// GET /api/products
export const listProducts = catchAsync(async (req, res) => {
  const {
    q, tag, mainTag, minPrice, maxPrice, sort = 'new' // simple filters
  } = req.query

  const filter = {}
  if (q) filter.$text = { $search: q }
  if (tag) filter.tags = tag
  if (mainTag) filter.mainTags = mainTag
  if (minPrice || maxPrice) {
    filter.price = {}
    if (minPrice) filter.price.$gte = Number(minPrice)
    if (maxPrice) filter.price.$lte = Number(maxPrice)
  }

  // sort options
  const sortMap = {
    new: { createdAt: -1 },
    price_asc: { price: 1 },
    price_desc: { price: -1 },
    rating: { rating: -1, reviewsCount: -1 }
  }
  const sortBy = sortMap[sort] || sortMap.new

  const items = await Product.find(filter).sort(sortBy).lean({ virtuals: true })
  res.json({ ok: true, items })
})

// GET /api/products/:slug
export const getProductBySlug = catchAsync(async (req, res) => {
  const { slug } = req.params
  const p = await Product.findOne({ slug }).lean({ virtuals: true })
  if (!p) throw new ApiError(404, 'Product not found')
  res.json({ ok: true, product: p })
})
