import Product from '../models/Product.js'
import catchAsync from '../../utils/catchAsync.js'
import ApiError from '../../utils/ApiError.js'
import mongoose from 'mongoose'

const RESERVED_CATEGORY_TAGS = ['men', 'women', 'kids']

function escapeRegExp(str = '') {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function parseArray(v) {
  if (!v) return []
  if (Array.isArray(v)) return v.filter(Boolean)
  return String(v)
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
}

function toFiniteNumber(value) {
  if (value === '' || value === null || value === undefined) return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

// GET /api/products
export const listProducts = catchAsync(async (req, res) => {
  // support both old and new param names for compatibility
  const {
    q = '',
    sort = 'new',
    page = '1',
    limit = '24',

    // new filters
    category,                 // 'men' | 'women' | 'kids'
    categoryId,               // ObjectId string
    color,                    // csv
    priceMin: qpMin,          // number
    priceMax: qpMax,          // number
    ratingMin,                // number (1..5)
    stock = 'any',            // 'any' | 'in' | 'low' | 'out'
    tags,                     // csv (exclude men/women/kids)
    mainTag = 'any',          // 'any' | 'new' | 'old'

    // old names (fallback)
    minPrice,
    maxPrice,
    tag
  } = req.query

  const priceMin = qpMin ?? minPrice
  const priceMax = qpMax ?? maxPrice

  const pageNum = Math.max(parseInt(page, 10) || 1, 1)
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 24, 1), 60)
  const skip = (pageNum - 1) * limitNum

  const match = {}
  let catClause = null

  // name/text search
  if (q && String(q).trim().length > 0) {
    match.$text = { $search: String(q).trim() }
  }

  // category (tab): prefer top-level field, fallback to tag
  if (category && ['men', 'women', 'kids'].includes(String(category).toLowerCase())) {
    const cat = String(category).toLowerCase()
    const catRx = new RegExp(`^${escapeRegExp(cat)}$`, 'i')
    catClause = { $or: [{ category: catRx }, { tags: catRx }] }
  }
  // normalized category by id
  if (categoryId && mongoose.isValidObjectId(String(categoryId))) {
    match.categoryRef = new mongoose.Types.ObjectId(String(categoryId))
  }

  // color (array csv) - normalized exact matches using indexed field
  const colorsInput = parseArray(color).map((c) => String(c).toLowerCase().trim()).filter(Boolean)
  if (colorsInput.length) {
    // Prefer indexed colorLower, but fall back to evaluating on the fly
    match.$and = (match.$and || []).concat([
      {
        $or: [
          { colorLower: { $in: colorsInput } },
          { $expr: { $in: [{ $toLower: '$color' }, colorsInput ] } }
        ]
      }
    ])
  }

  // price (only include finite values)
  const priceFilter = {}
  const pmin = toFiniteNumber(priceMin)
  const pmax = toFiniteNumber(priceMax)
  if (pmin !== undefined) priceFilter.$gte = pmin
  if (pmax !== undefined) priceFilter.$lte = pmax
  if (Object.keys(priceFilter).length) match.price = priceFilter

  // rating (only include finite values)
  const rmin = toFiniteNumber(ratingMin)
  if (rmin !== undefined) {
    match.rating = { $gte: rmin }
  }

  // stock
  if (stock && stock !== 'any') {
    if (stock === 'in') {
      match.stock = { $gt: 0 }
    } else if (stock === 'low') {
      // use $expr to compare fields; if lowStockThreshold is missing, default to 5
      match.$expr = { $and: [
        { $gt: ['$stock', 0] },
        { $lte: ['$stock', { $ifNull: ['$lowStockThreshold', 5] }] }
      ] }
    } else if (stock === 'out') {
      match.stock = { $lte: 0 }
    }
  }

  // tags: honor new param `tags` (csv) and legacy `tag` (single)
  let tagList = parseArray(tags)
  if (tag && !tagList.includes(tag)) tagList.push(tag)
  tagList = tagList.filter(t => !RESERVED_CATEGORY_TAGS.includes(String(t).toLowerCase()))
  if (tagList.length) {
    const tagRegexes = tagList.map((t) => new RegExp(`^${escapeRegExp(String(t).trim())}$`, 'i'))
    match.tags = { $in: tagRegexes }
  }

  // mainTag filters: support curated flags and legacy 'old'
  if (mainTag && mainTag !== 'any') {
    const mt = String(mainTag).toLowerCase()
    const curated = ['new', 'discount', 'limited', 'bestseller', 'featured']
    if (curated.includes(mt)) {
      match.mainTags = { $in: [mt] }
    } else if (mt === 'old') {
      // 'old' = anything not explicitly tagged as 'new'
      match.$and = (match.$and || []).concat([{ mainTags: { $nin: ['new'] } }])
    }
  }

  // Always apply category filter so results and facets remain scoped (even if 0 items)
  if (catClause) {
    match.$and = (match.$and || []).concat([catClause])
  }

  // sort options
  const sortMap = {
    new: { createdAt: -1 },
    price_asc: { price: 1, createdAt: -1 },
    price_desc: { price: -1, createdAt: -1 },
    rating: { rating: -1, reviewsCount: -1, createdAt: -1 }
  }
  const sortBy = sortMap[sort] || sortMap.new

  // query + count
  const projection = 'name slug images price discountPercent rating reviewsCount stock lowStockThreshold mainTags tags color createdAt'
  const [docs, total] = await Promise.all([
    Product.find(match).select(projection).sort(sortBy).skip(skip).limit(limitNum).lean(),
    Product.countDocuments(match)
  ])

  // facets for filters (based on current scope)
  const [colorsFacet, tagsFacet, mainFacet] = await Promise.all([
    Product.distinct('color', match),
    Product.distinct('tags', match),
    Product.distinct('mainTags', match)
  ])

  const items = docs.map(p => ({
    ...p,
    id: p._id,
    finalPrice: p.discountPercent
      ? Math.round((p.price * (1 - p.discountPercent / 100)) * 100) / 100
      : p.price,
    lowStock: p.stock > 0 && p.stock <= (p.lowStockThreshold || 5)
  }))

  // Short client-side caching to reduce repeat loads
  res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=120')
  res.json({
    ok: true,
    items,
    page: pageNum,
    limit: limitNum,
    total,
    facets: {
      colors: (colorsFacet || []).filter(Boolean).sort((a, b) => a.localeCompare(b)),
      tags: (tagsFacet || [])
        .filter(Boolean)
        .filter(t => !RESERVED_CATEGORY_TAGS.includes(String(t).toLowerCase()))
        .sort((a, b) => a.localeCompare(b)),
      mainTags: Array.from(new Set((mainFacet || []).filter(Boolean))).sort()
    }
  })
})

// GET /api/products/highlights
export const getHighlights = catchAsync(async (req, res) => {
  const { q = '', category, categoryId, limit = '8' } = req.query
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 8, 1), 16)

  const filter = {}
  if (q && String(q).trim()) filter.$text = { $search: String(q).trim() }

  if (category && ['men', 'women', 'kids'].includes(String(category).toLowerCase())) {
    const cat = String(category).toLowerCase()
    // Use case-insensitive exact-match, consistent with listProducts
    const catRx = new RegExp(`^${escapeRegExp(cat)}$`, 'i')
    const catClause = { $or: [{ category: catRx }, { tags: catRx }] }
    filter.$and = (filter.$and || []).concat([catClause])
  }
  if (categoryId && mongoose.isValidObjectId(String(categoryId))) {
    filter.categoryRef = new mongoose.Types.ObjectId(String(categoryId))
  }

  const pick = 'name slug images price discountPercent rating reviewsCount stock mainTags color createdAt'

  const [latest, topRatedAgg, popular] = await Promise.all([
    Product.find(filter).sort({ createdAt: -1 }).limit(limitNum).select(pick).lean(),
    // Top Rated via aggregation to avoid stale product.rating values.
    Product.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: 'reviews',
          let: { pid: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$product', '$$pid'] } } },
            { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }
          ],
          as: 'reviewStats'
        }
      },
      {
        $addFields: {
          rating: { $round: [{ $ifNull: [{ $arrayElemAt: ['$reviewStats.avg', 0] }, 0] }, 1] },
          reviewsCount: { $ifNull: [{ $arrayElemAt: ['$reviewStats.count', 0] }, 0] }
        }
      },
      { $match: { rating: { $gt: 0 }, reviewsCount: { $gt: 0 } } },
      { $sort: { rating: -1, reviewsCount: -1, createdAt: -1 } },
      { $limit: limitNum },
      {
        $project: {
          name: 1, slug: 1, images: 1, price: 1, discountPercent: 1, rating: 1, reviewsCount: 1,
          stock: 1, lowStockThreshold: 1, mainTags: 1, color: 1, createdAt: 1
        }
      }
    ]),
    // Trending: require at least one review to avoid zero-review items surfacing
    Product.find({ ...filter, reviewsCount: { $gt: 0 } })
      .sort({ reviewsCount: -1, rating: -1, createdAt: -1 })
      .limit(limitNum)
      .select(pick)
      .lean()
  ])

  const mapLite = (arr) =>
    (arr || []).map(p => ({
      ...p,
      id: p._id,
      finalPrice: p.discountPercent
        ? Math.round((p.price * (1 - p.discountPercent / 100)) * 100) / 100
        : p.price,
      lowStock: p.stock > 0 && p.stock <= (p.lowStockThreshold || 5)
    }))

  res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=120')
  res.json({ ok: true, latest: mapLite(latest), topRated: mapLite(topRatedAgg), popular: mapLite(popular) })
})

// GET /api/products/suggest?q=...
export const suggestProducts = catchAsync(async (req, res) => {
  const { q } = req.query
  if (!q || !String(q).trim()) return res.json({ ok: true, items: [] })

  const items = await Product.find(
    { $text: { $search: String(q).trim() } },
    { score: { $meta: 'textScore' } }
  )
    .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
    .limit(8)
    .select('name slug images price discountPercent')
    .lean()

  const mapped = items.map(p => ({
    ...p,
    id: p._id,
    finalPrice: p.discountPercent
      ? Math.round((p.price * (1 - p.discountPercent / 100)) * 100) / 100
      : p.price
  }))

  res.set('Cache-Control', 'public, max-age=30')
  res.json({ ok: true, items: mapped })
})

// GET /api/products/:slug
export const getProductBySlug = catchAsync(async (req, res) => {
  const { slug } = req.params
  const p = await Product.findOne({ slug }).lean()
  if (!p) throw new ApiError(404, 'Product not found')

  const product = {
    ...p,
    id: p._id,
    finalPrice: p.discountPercent
      ? Math.round((p.price * (1 - p.discountPercent / 100)) * 100) / 100
      : p.price,
    lowStock: p.stock > 0 && p.stock <= (p.lowStockThreshold || 5)
  }

  res.set('Cache-Control', 'public, max-age=30')
  res.json({ ok: true, product })
})
