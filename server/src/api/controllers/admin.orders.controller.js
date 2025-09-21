import ApiError from '../../utils/ApiError.js'
import catchAsync from '../../utils/catchAsync.js'
import Order from '../models/Order.js'
import User from '../models/User.js'

const ALLOWED_STATUSES = [
  'pending_payment','placed','packing','handed_over','out_for_delivery','payment_confirm','delivery_confirm','delivery_confirm_bank','completed'
]

function toObjectIdMaybe(id) {
  // naive check for 24-hex string
  return /^[a-fA-F0-9]{24}$/.test(String(id)) ? id : null
}

export const listOrders = catchAsync(async (req, res) => {
  const { q = '', status, page = 1, limit = 20 } = req.query

  const filters = []
  if (status && ALLOWED_STATUSES.includes(String(status))) {
    filters.push({ status })
  }

  if (q && String(q).trim()) {
    const ql = String(q).trim()
    const rx = new RegExp(ql.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')

    const userIds = await User.find({ $or: [{ email: rx }, { username: rx }] }).select('_id').lean()
    const idList = userIds.map(u => u._id)

    const or = [
      { 'items.slug': rx },
      { 'items.name': rx }
    ]
    const oid = toObjectIdMaybe(ql)
    if (oid) or.push({ _id: oid })
    if (idList.length) or.push({ user: { $in: idList } })

    filters.push({ $or: or })
  }

  const where = filters.length ? { $and: filters } : {}
  const pageNum = Math.max(parseInt(page, 10) || 1, 1)
  const perPage = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100)
  const skip = (pageNum - 1) * perPage

  const [items, total] = await Promise.all([
    Order.find(where).sort({ createdAt: -1 }).skip(skip).limit(perPage).lean(),
    Order.countDocuments(where)
  ])

  res.json({ ok: true, items, page: pageNum, limit: perPage, total, hasMore: skip + items.length < total })
})

export const getOrder = catchAsync(async (req, res) => {
  const { id } = req.params
  const o = await Order.findById(id).lean()
  if (!o) throw new ApiError(404, 'Order not found')
  res.json({ ok: true, order: o })
})

export const updateStatus = catchAsync(async (req, res) => {
  const { id } = req.params
  const { status } = req.body || {}
  if (!ALLOWED_STATUSES.includes(String(status))) {
    throw new ApiError(400, 'Invalid status')
  }
  const o = await Order.findById(id)
  if (!o) throw new ApiError(404, 'Order not found')
  o.status = status
  o.statusHistory = (o.statusHistory || []).concat([{ status, at: new Date() }])
  await o.save()
  res.json({ ok: true, order: o })
})

export const verifyBankSlip = catchAsync(async (req, res) => {
  const { id } = req.params
  const o = await Order.findById(id)
  if (!o) throw new ApiError(404, 'Order not found')
  if (o.payment?.method !== 'BANK') throw new ApiError(400, 'Not a bank transfer order')

  o.payment.bank = o.payment.bank || {}
  o.payment.bank.verifiedAt = o.payment.bank.verifiedAt || new Date()
  o.payment.status = 'paid'
  await o.save()

  res.json({ ok: true, order: o })
})