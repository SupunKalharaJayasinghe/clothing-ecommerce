import ApiError from '../../utils/ApiError.js'
import catchAsync from '../../utils/catchAsync.js'
import Product from '../models/Product.js'
import mongoose from 'mongoose'

function mapProduct(p) {
  if (!p) return null
  return {
    id: p._id,
    name: p.name,
    slug: p.slug,
    images: p.images,
    color: p.color,
    description: p.description,
    price: p.price,
    discountPercent: p.discountPercent || 0,
    rating: p.rating || 0,
    reviewsCount: p.reviewsCount || 0,
    stock: p.stock || 0,
    lowStockThreshold: p.lowStockThreshold || 5,
    tags: p.tags || [],
    mainTags: p.mainTags || [],
    category: p.category,
    categoryId: p.categoryRef || undefined,
    metaTitle: p.metaTitle,
    metaDescription: p.metaDescription,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt
  }
}

export const listProducts = catchAsync(async (req, res) => {
  const { q = '', page = 1, limit = 20, category, categoryId } = req.query

  const filters = []
  if (q) {
    const ql = String(q).trim()
    const rx = new RegExp(ql.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    filters.push({ $or: [ { name: rx }, { slug: rx }, { description: rx }, { tags: rx } ] })
  }
  if (category) filters.push({ category })
  if (categoryId && mongoose.isValidObjectId(String(categoryId))) filters.push({ categoryRef: categoryId })

  const where = filters.length ? { $and: filters } : {}
  const pageNum = Math.max(parseInt(page, 10) || 1, 1)
  const perPage = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100)
  const skip = (pageNum - 1) * perPage

  const [items, total] = await Promise.all([
    Product.find(where).sort({ createdAt: -1 }).skip(skip).limit(perPage).lean(),
    Product.countDocuments(where)
  ])

  res.json({ ok: true, items: items.map(mapProduct), page: pageNum, limit: perPage, total, hasMore: skip + items.length < total })
})

export const getProduct = catchAsync(async (req, res) => {
  const { id } = req.params
  const p = await Product.findById(id).lean()
  if (!p) throw new ApiError(404, 'Product not found')
  res.json({ ok: true, product: mapProduct(p) })
})

export const createProduct = catchAsync(async (req, res) => {
  const {
    name,
    images,
    color,
    description,
    price,
    discountPercent = 0,
    stock = 0,
    lowStockThreshold = 5,
    tags = [],
    mainTags = [],
    category,
    categoryId,
    metaTitle,
    metaDescription
  } = req.body

  const created = await Product.create({
    name,
    images,
    color,
    description,
    price,
    discountPercent,
    stock,
    lowStockThreshold,
    tags,
    mainTags,
    category,
    categoryRef: mongoose.isValidObjectId(String(categoryId)) ? categoryId : undefined,
    metaTitle,
    metaDescription
  })

  res.status(201).json({ ok: true, product: mapProduct(created) })
})

export const updateProduct = catchAsync(async (req, res) => {
  const { id } = req.params
  const update = req.body || {}
  const p = await Product.findById(id)
  if (!p) throw new ApiError(404, 'Product not found')

  // Assign only known fields
  const fields = ['name','images','color','description','price','discountPercent','stock','lowStockThreshold','tags','mainTags','category','metaTitle','metaDescription']
  for (const f of fields) {
    if (Object.prototype.hasOwnProperty.call(update, f)) {
      p[f] = update[f]
    }
  }

  // Optional categoryRef via categoryId
  if (Object.prototype.hasOwnProperty.call(update, 'categoryId')) {
    const cid = update.categoryId
    p.categoryRef = mongoose.isValidObjectId(String(cid)) ? cid : undefined
  }

  await p.save()
  res.json({ ok: true, product: mapProduct(p) })
})

export const getProductDetails = catchAsync(async (req, res) => {
  const { id } = req.params
  const p = await Product.findById(id).lean()
  if (!p) throw new ApiError(404, 'Product not found')
  
  // Include additional details for detailed report
  const productDetails = {
    ...mapProduct(p),
    slug: p.slug,
    metaTitle: p.metaTitle,
    metaDescription: p.metaDescription,
    finalPrice: p.discountPercent ? p.price * (1 - p.discountPercent / 100) : p.price
  }
  
  res.json({ ok: true, product: productDetails })
})

export const deleteProduct = catchAsync(async (req, res) => {
  const { id } = req.params
  const p = await Product.findById(id)
  if (!p) return res.json({ ok: true })
  await p.deleteOne()
  res.json({ ok: true })
})
