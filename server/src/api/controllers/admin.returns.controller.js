import ApiError from '../../utils/ApiError.js'
import catchAsync from '../../utils/catchAsync.js'
import Order from '../models/Order.js'
import Return from '../models/Return.js'

const RETURN_STATUSES = ['requested','approved','rejected','received','closed']

export const listReturnAudits = catchAsync(async (req, res) => {
  const { q = '', status, page = 1, limit = 20 } = req.query

  const filters = []
  if (status && RETURN_STATUSES.includes(String(status))) {
    filters.push({ status })
  }
  if (q && String(q).trim()) {
    const ql = String(q).trim()
    filters.push({ order: ql })
  }

  const where = filters.length ? { $and: filters } : {}
  const pageNum = Math.max(parseInt(page, 10) || 1, 1)
  const perPage = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100)
  const skip = (pageNum - 1) * perPage

  const [items, total] = await Promise.all([
    Return.find(where).sort({ updatedAt: -1 }).skip(skip).limit(perPage).populate('order').lean(),
    Return.countDocuments(where)
  ])

  res.json({ ok: true, items, page: pageNum, limit: perPage, total, hasMore: skip + items.length < total })
})

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

  // upsert into Return collection
  await Return.findOneAndUpdate(
    { order: o._id },
    {
      order: o._id,
      status: 'requested',
      reason: String(reason || '').trim() || undefined,
      requestedAt: o.returnRequest.requestedAt,
      updatedAt: o.returnRequest.updatedAt,
      createdBy: 'admin'
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
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
  // Reflect in Return collection
  const update = { status, updatedAt: o.returnRequest.updatedAt }
  if (status === 'closed') update.closedAt = o.returnRequest.closedAt
  await Return.findOneAndUpdate(
    { order: o._id },
    { $set: update, $setOnInsert: { order: o._id, requestedAt: o.returnRequest.requestedAt, reason: o.returnRequest.reason, createdBy: 'admin' } },
    { upsert: true }
  )
  res.json({ ok: true, order: o })
})

export const getReturnDetails = catchAsync(async (req, res) => {
  const { id } = req.params
  const returnDoc = await Return.findById(id)
    .populate({
      path: 'order',
      populate: {
        path: 'user',
        select: 'firstName lastName email username'
      }
    })
    .lean()
  if (!returnDoc) {
    throw new ApiError(404, 'Return not found')
  }
  
  // Include additional details for detailed report
  const returnDetails = {
    ...returnDoc,
    customerName: returnDoc.order?.user ? `${returnDoc.order.user.firstName || ''} ${returnDoc.order.user.lastName || ''}`.trim() : 'Guest',
    customerEmail: returnDoc.order?.user?.email || 'N/A',
    orderId: returnDoc.order?._id || 'N/A',
    orderTotal: returnDoc.order?.totals?.grandTotal || 0,
    returnStatus: returnDoc.status || 'N/A',
    returnReason: returnDoc.reason || 'N/A',
    itemsReturned: returnDoc.order?.items?.length || 0
  }
  
  res.json({ ok: true, return: returnDetails })
})
