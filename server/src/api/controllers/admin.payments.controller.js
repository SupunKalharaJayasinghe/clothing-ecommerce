import ApiError from '../../utils/ApiError.js'
import catchAsync from '../../utils/catchAsync.js'
import Order from '../models/Order.js'
import { PAYMENT_STATES, updateOrderStates, applyStateChanges } from '../../utils/stateManager.js'

const PAYMENT_STATUSES = ['UNPAID','PENDING','AUTHORIZED','PAID','FAILED','REFUND_PENDING','REFUNDED']

export const listPayments = catchAsync(async (req, res) => {
  const { q = '', method, status, page = 1, limit = 20 } = req.query

  const filters = []
  if (method && ['COD','CARD','BANK'].includes(String(method))) {
    filters.push({ 'payment.method': method })
  }
  if (status && PAYMENT_STATUSES.includes(String(status))) {
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
    Order.find(where).sort({ createdAt: -1 }).skip(skip).limit(perPage).lean(),
    Order.countDocuments(where)
  ])

  res.json({ ok: true, items, page: pageNum, limit: perPage, total, hasMore: skip + items.length < total })
})

export const verifyBankSlip = catchAsync(async (req, res) => {
  const { id } = req.params
  const o = await Order.findById(id)
  if (!o) throw new ApiError(404, 'Order not found')
  if (o.payment?.method !== 'BANK') throw new ApiError(400, 'Not a bank transfer order')

  o.payment.bank = o.payment.bank || {}
  o.payment.bank.verifiedAt = o.payment.bank.verifiedAt || new Date()
  
  // Use state manager for payment status update
  const changes = updateOrderStates(o, { paymentStatus: PAYMENT_STATES.PAID })
  applyStateChanges(o, changes)
  await o.save()

  res.json({ ok: true, order: o })
})

export const updatePaymentStatus = catchAsync(async (req, res) => {
  const { id } = req.params
  const { status } = req.body || {}
  if (!PAYMENT_STATUSES.includes(String(status))) {
    throw new ApiError(400, 'Invalid payment status')
  }
  const o = await Order.findById(id)
  if (!o) throw new ApiError(404, 'Order not found')
  
  // Use state manager for consistent payment status update
  const changes = updateOrderStates(o, { paymentStatus: status })
  applyStateChanges(o, changes)
  await o.save()
  res.json({ ok: true, order: o })
})