import catchAsync from '../../utils/catchAsync.js'
import Order from '../models/Order.js'
import Refund from '../models/Refund.js'

// Legacy-compatible list: returns Orders by refund filters
export const listRefunds = catchAsync(async (req, res) => {
  const { q = '', method, status = 'refunded', page = 1, limit = 20 } = req.query

  const statusMap = {
    pending: 'REQUESTED',
    initiated: 'REQUESTED',
    refunded: 'PROCESSED',
    paid: 'PROCESSED',
    failed: 'FAILED'
  }

  const refundFilters = []
  if (method && ['COD','CARD','BANK'].includes(String(method))) {
    refundFilters.push({ method })
  }
  if (status && statusMap[String(status)]) {
    refundFilters.push({ status: statusMap[String(status)] })
  }

  if (q && String(q).trim()) {
    const ql = String(q).trim()
    const rx = new RegExp(ql.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    const orderIds = await Order.find({ $or: [ { _id: ql }, { 'items.slug': rx }, { 'items.name': rx } ] })
      .select('_id')
      .limit(200)
      .lean()
    const ids = orderIds.map(d => d._id)
    if (!ids.length) {
      return res.json({ ok: true, items: [], page: 1, limit: Number(limit) || 20, total: 0, hasMore: false })
    }
    refundFilters.push({ order: { $in: ids } })
  }

  const where = refundFilters.length ? { $and: refundFilters } : {}
  const pageNum = Math.max(parseInt(page, 10) || 1, 1)
  const perPage = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100)
  const skip = (pageNum - 1) * perPage

  const [refunds, total] = await Promise.all([
    Refund.find(where).sort({ createdAt: -1 }).skip(skip).limit(perPage).populate('order').lean(),
    Refund.countDocuments(where)
  ])

  const items = refunds.map(r => r.order).filter(Boolean)
  res.json({ ok: true, items, page: pageNum, limit: perPage, total, hasMore: skip + items.length < total })
})

// Audit list: returns Refund documents directly
export const listRefundAudits = catchAsync(async (req, res) => {
  const { q = '', method, status, page = 1, limit = 20 } = req.query

  const statusMap = {
    pending: 'REQUESTED',
    initiated: 'REQUESTED',
    refunded: 'PROCESSED',
    paid: 'PROCESSED',
    failed: 'FAILED'
  }

  const filters = []
  if (method && ['COD','CARD','BANK'].includes(String(method))) {
    filters.push({ method })
  }
  if (status) {
    const mapped = statusMap[String(status)] || String(status)
    filters.push({ status: mapped })
  }

  if (q && String(q).trim()) {
    const ql = String(q).trim()
    const rx = new RegExp(ql.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    const orderIds = await Order.find({ $or: [ { _id: ql }, { 'items.slug': rx }, { 'items.name': rx } ] })
      .select('_id')
      .limit(200)
      .lean()
    const ids = orderIds.map(d => d._id)
    if (!ids.length) {
      return res.json({ ok: true, items: [], page: 1, limit: Number(limit) || 20, total: 0, hasMore: false })
    }
    filters.push({ order: { $in: ids } })
  }

  const where = filters.length ? { $and: filters } : {}
  const pageNum = Math.max(parseInt(page, 10) || 1, 1)
  const perPage = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 200)
  const skip = (pageNum - 1) * perPage

  const [items, total] = await Promise.all([
    Refund.find(where).sort({ createdAt: -1 }).skip(skip).limit(perPage).populate('order').lean(),
    Refund.countDocuments(where)
  ])

  res.json({ ok: true, items, page: pageNum, limit: perPage, total, hasMore: skip + items.length < total })
})
