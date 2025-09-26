import catchAsync from '../../utils/catchAsync.js'
import Order from '../models/Order.js'

export const listRefunds = catchAsync(async (req, res) => {
  const { q = '', method, status = 'refunded', page = 1, limit = 20 } = req.query

  const filters = []
  if (method && ['COD','CARD','BANK'].includes(String(method))) {
    filters.push({ 'payment.method': method })
  }
  if (status) {
    filters.push({ 'payment.status': status })
  }

  if (q && String(q).trim()) {
    const ql = String(q).trim()
    const rx = new RegExp(ql.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    filters.push({ $or: [ { _id: ql }, { 'items.slug': rx }, { 'items.name': rx } ] })
  }

  const where = filters.length ? { $and: filters } : {}
  const pageNum = Math.max(parseInt(page, 10) || 1, 1)
  const perPage = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100)
  const skip = (pageNum - 1) * perPage

  const [items, total] = await Promise.all([
    Order.find(where).sort({ updatedAt: -1 }).skip(skip).limit(perPage).lean(),
    Order.countDocuments(where)
  ])

  res.json({ ok: true, items, page: pageNum, limit: perPage, total, hasMore: skip + items.length < total })
})