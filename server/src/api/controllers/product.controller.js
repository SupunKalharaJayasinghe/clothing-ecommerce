import Product from '../models/Product.js'
import catchAsync from '../../utils/catchAsync.js'
import ApiError from '../../utils/ApiError.js'

const RESERVED_CATEGORY_TAGS = ['men', 'women', 'kids']

function parseArray(v) {
  if (!v) return []
  if (Array.isArray(v)) return v.filter(Boolean)
  return String(v)
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
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
    catClause = { $or: [{ category: cat }, { tags: cat }] }
  }

  // color (array csv)
  const colors = parseArray(color).map(c => c.toLowerCase())
  if (colors.length) match.color = { $in: colors }

  // price
  const priceFilter = {}
  if (priceMin !== undefined && priceMin !== '') priceFilter.$gte = Number(priceMin)
  if (priceMax !== undefined && priceMax !== '') priceFilter.$lte = Number(priceMax)
  if (Object.keys(priceFilter).length) match.price = priceFilter

  // rating
  if (ratingMin !== undefined && ratingMin !== '') {
    match.rating = { $gte: Number(ratingMin) }
  }

  // stock
  if (stock && stock !== 'any') {
    if (stock === 'in') {
      match.stock = { $gt: 0 }
    } else if (stock === 'low') {
      // use $expr to compare fields
      match.$expr = { $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', '$lowStockThreshold'] }] }
    } else if (stock === 'out') {
      match.stock = { $lte: 0 }
    }
  }

  // tags: honor new param `tags` (csv) and legacy `tag` (single)
  let tagList = parseArray(tags)
  if (tag && !tagList.includes(tag)) tagList.push(tag)
  tagList = tagList.filter(t => !RESERVED_CATEGORY_TAGS.includes(String(t).toLowerCase()))
  if (tagList.length) match.tags = { $in: tagList }

  // mainTag: 'new' | 'old' | 'any'
  if (mainTag && mainTag !== 'any') {
    if (mainTag === 'new') {
      match.mainTags = { $in: ['new'] }
    } else if (mainTag === 'old') {
      match.$and = (match.$and || []).concat([{ mainTags: { $nin: ['new'] } }])
    }
  }

  // Only apply category filter if DB actually has any rows for it (prevents blank screens)
  if (catClause) {
    const hasAnyForCategory = await Product.countDocuments(catClause)
    if (hasAnyForCategory > 0) {
      match.$and = (match.$and || []).concat([catClause])
    }
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
  const [docs, total] = await Promise.all([
    Product.find(match).sort(sortBy).skip(skip).limit(limitNum).lean(),
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
      ? Math.round(p.price * (100 - p.discountPercent)) / 100
      : p.price,
    lowStock: p.stock > 0 && p.stock <= (p.lowStockThreshold || 5)
  }))

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
  const { q = '', category, limit = '8' } = req.query
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 8, 1), 16)

  const filter = {}
  if (q && String(q).trim()) filter.$text = { $search: String(q).trim() }

  if (category && ['men', 'women', 'kids'].includes(String(category).toLowerCase())) {
    const cat = String(category).toLowerCase()
    const catClause = { $or: [{ category: cat }, { tags: cat }] }
    const hasAny = await Product.countDocuments(catClause)
    if (hasAny > 0) {
      filter.$and = (filter.$and || []).concat([catClause])
    }
  }

  const pick = 'name slug images price discountPercent rating reviewsCount stock mainTags color createdAt'

  const [latest, topRated, popular] = await Promise.all([
    Product.find(filter).sort({ createdAt: -1 }).limit(limitNum).select(pick).lean(),
    Product.find(filter).sort({ rating: -1, reviewsCount: -1, createdAt: -1 }).limit(limitNum).select(pick).lean(),
    Product.find(filter).sort({ purchases: -1, reviewsCount: -1, rating: -1, createdAt: -1 }).limit(limitNum).select(pick).lean()
  ])

  const mapLite = (arr) =>
    (arr || []).map(p => ({
      ...p,
      id: p._id,
      finalPrice: p.discountPercent
        ? Math.round(p.price * (100 - p.discountPercent)) / 100
        : p.price,
      lowStock: p.stock > 0 && p.stock <= (p.lowStockThreshold || 5)
    }))

  res.json({ ok: true, latest: mapLite(latest), topRated: mapLite(topRated), popular: mapLite(popular) })
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
      ? Math.round(p.price * (100 - p.discountPercent)) / 100
      : p.price
  }))

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
      ? Math.round(p.price * (100 - p.discountPercent)) / 100
      : p.price,
    lowStock: p.stock > 0 && p.stock <= (p.lowStockThreshold || 5)
  }

  res.json({ ok: true, product })
})
