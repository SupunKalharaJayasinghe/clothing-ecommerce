import ApiError from '../../utils/ApiError.js'
import catchAsync from '../../utils/catchAsync.js'
import Category from '../models/Category.js'
import Product from '../models/Product.js'

function mapCategory(c) {
  if (!c) return null
  return {
    id: c._id,
    name: c.name,
    slug: c.slug,
    parent: c.parent || null,
    sortOrder: c.sortOrder || 0,
    active: c.active !== false,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt
  }
}

function toSlug(str) {
  return String(str).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
}

export const listCategories = catchAsync(async (req, res) => {
  const { q = '', page = 1, limit = 50 } = req.query || {}
  const filters = []
  if (q && String(q).trim()) {
    const rx = new RegExp(String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    filters.push({ $or: [{ name: rx }, { slug: rx }] })
  }
  const where = filters.length ? { $and: filters } : {}
  const pageNum = Math.max(parseInt(page, 10) || 1, 1)
  const perPage = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200)
  const skip = (pageNum - 1) * perPage
  const [items, total] = await Promise.all([
    Category.find(where).sort({ sortOrder: 1, name: 1 }).skip(skip).limit(perPage).lean(),
    Category.countDocuments(where)
  ])
  res.json({ ok: true, items: items.map(mapCategory), page: pageNum, limit: perPage, total, hasMore: skip + items.length < total })
})

export const getCategory = catchAsync(async (req, res) => {
  const { id } = req.params
  const c = await Category.findById(id).lean()
  if (!c) throw new ApiError(404, 'Category not found')
  res.json({ ok: true, category: mapCategory(c) })
})

export const createCategory = catchAsync(async (req, res) => {
  const { name, slug, parent = null, sortOrder = 0, active = true } = req.body || {}
  if (!name || String(name).trim().length < 2) throw new ApiError(400, 'Name is required')
  const sl = toSlug(slug || name)
  const existing = await Category.findOne({ slug: sl })
  if (existing) throw new ApiError(409, 'Slug already exists')
  const c = await Category.create({ name, slug: sl, parent: parent || null, sortOrder, active })
  res.status(201).json({ ok: true, category: mapCategory(c) })
})

export const updateCategory = catchAsync(async (req, res) => {
  const { id } = req.params
  const { name, slug, parent, sortOrder, active } = req.body || {}
  const c = await Category.findById(id)
  if (!c) throw new ApiError(404, 'Category not found')

  if (name && name !== c.name) c.name = name
  if (typeof active === 'boolean') c.active = active
  if (typeof sortOrder === 'number') c.sortOrder = sortOrder
  if (typeof parent !== 'undefined') c.parent = parent || null
  if (slug) {
    const sl = toSlug(slug)
    if (sl !== c.slug) {
      const exists = await Category.findOne({ slug: sl, _id: { $ne: id } })
      if (exists) throw new ApiError(409, 'Slug already exists')
      c.slug = sl
    }
  }

  await c.save()
  res.json({ ok: true, category: mapCategory(c) })
})

export const deleteCategory = catchAsync(async (req, res) => {
  const { id } = req.params
  const c = await Category.findById(id)
  if (!c) return res.json({ ok: true })
  const inUse = await Product.exists({ categoryRef: id })
  if (inUse) throw new ApiError(400, 'Cannot delete a category that is referenced by products')
  await c.deleteOne()
  res.json({ ok: true })
})
