import ApiError from '../../utils/ApiError.js'
import catchAsync from '../../utils/catchAsync.js'
import Order from '../models/Order.js'

const RETURN_STATUSES = ['requested','approved','rejected','received','closed']

export const listReturns = catchAsync(async (req, res) => {
  const { q = '', status, page = 1, limit = 20 } = req.query

  const filters = [{ 'returnRequest.status': { $exists: true } }]
  if (status && RETURN_STATUSES.includes(String(status))) {
    filters.push({ 'returnRequest.status': status })
  }

  if (q && String(q).trim()) {
    const ql = String(q).trim()
    filters.push({ _id: ql })
  }

  const where = { $and: filters }
  const pageNum = Math.max(parseInt(page, 10) || 1, 1)
  const perPage = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100)
  const skip = (pageNum - 1) * perPage

  const [items, total] = await Promise.all([
    Order.find(where).sort({ updatedAt: -1 }).skip(skip).limit(perPage).lean(),
    Order.countDocuments(where)
  ])

  res.json({ ok: true, items, page: pageNum, limit: perPage, total, hasMore: skip + items.length < total })
})

export const initReturn = catchAsync(async (req, res) => {
  const { id } = req.params
  const { reason = '' } = req.body || {}
  const o = await Order.findById(id)
  if (!o) throw new ApiError(404, 'Order not found')
  if (o.returnRequest?.status) {
    return res.status(400).json({ ok: false, message: 'Return already initialized' })
  }
  o.returnRequest = {
    status: 'requested',
    reason: String(reason || '').trim() || undefined,
    requestedAt: new Date(),
    updatedAt: new Date()
  }
  await o.save()
  res.json({ ok: true, order: o })
})

export const updateReturnStatus = catchAsync(async (req, res) => {
  const { id } = req.params
  const { status } = req.body || {}
  if (!RETURN_STATUSES.includes(String(status))) {
    throw new ApiError(400, 'Invalid return status')
  }
  const o = await Order.findById(id)
  if (!o || !o.returnRequest?.status) throw new ApiError(404, 'Return not found on order')
  o.returnRequest.status = status
  o.returnRequest.updatedAt = new Date()
  if (status === 'closed') o.returnRequest.closedAt = new Date()
  await o.save()
  res.json({ ok: true, order: o })
})