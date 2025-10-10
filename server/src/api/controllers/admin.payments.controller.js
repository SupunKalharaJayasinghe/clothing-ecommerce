import ApiError from '../../utils/ApiError.js'
import catchAsync from '../../utils/catchAsync.js'
import Order from '../models/Order.js'
import { PAYMENT_STATES, updateOrderStates, applyStateChanges } from '../../utils/stateManager.js'
import PaymentTransaction from '../models/PaymentTransaction.js'
import Refund from '../models/Refund.js'
import { sendInvoiceEmail } from '../../utils/invoiceEmail.js'
import mongoose from 'mongoose'

const PAYMENT_STATUSES = ['UNPAID','PENDING','AUTHORIZED','PAID','FAILED','REFUND_PENDING','REFUNDED']

export const listPayments = catchAsync(async (req, res) => {
  const { q = '', method, status, page = 1, limit = 20 } = req.query

  const filters = []
  if (method && ['COD','CARD','BANK'].includes(String(method))) {
    filters.push({ 'payment.method': method })
  }
  if (status && String(status).trim()) {
    const s = String(status).trim()
    const rxStatus = new RegExp('^' + s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i')
    filters.push({ 'payment.status': rxStatus })
  }

  if (q && String(q).trim()) {
    const ql = String(q).trim()
    const rx = new RegExp(ql.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    const or = [
      { 'items.slug': rx },
      { 'items.name': rx },
      { $expr: { $regexMatch: { input: { $toString: '$_id' }, regex: rx } } }
    ]
    // If query looks like a valid ObjectId, allow direct _id match
    if (mongoose.Types.ObjectId.isValid(ql)) {
      or.unshift({ _id: new mongoose.Types.ObjectId(ql) })
    }
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

  // Log transaction
  await PaymentTransaction.create({
    order: o._id,
    method: 'BANK',
    action: 'BANK_VERIFIED',
    status: PAYMENT_STATES.PAID,
    amount: o.totals?.grandTotal,
    currency: 'LKR',
    notes: 'Bank slip verified by admin',
    createdBy: 'admin'
  })

  // Email invoice to customer after bank payment verification
  try { await sendInvoiceEmail({ order: o }) } catch (e) { /* non-blocking */ }

  res.json({ ok: true, order: o })
})

export const getPaymentDetails = catchAsync(async (req, res) => {
  const { id } = req.params
  const o = await Order.findById(id)
    .populate('user', 'firstName lastName email username')
    .lean()
  if (!o) throw new ApiError(404, 'Order not found')
  
  // Get payment transactions
  const transactions = await PaymentTransaction.find({ order: id }).sort({ createdAt: -1 }).lean()
  
  // Include additional details for detailed report
  const paymentDetails = {
    ...o,
    totalValue: o.totals?.grandTotal || 0,
    subtotal: o.totals?.subtotal || 0,
    shipping: o.totals?.shipping || 0,
    tax: o.totals?.tax || 0,
    discount: o.totals?.discount || 0,
    customerName: o.user ? `${o.user.firstName || ''} ${o.user.lastName || ''}`.trim() : 'Guest',
    customerEmail: o.user?.email || 'N/A',
    paymentStatus: o.payment?.status || 'N/A',
    paymentMethod: o.payment?.method || 'N/A',
    transactions: transactions
  }
  
  res.json({ ok: true, payment: paymentDetails })
})

export const listTransactions = catchAsync(async (req, res) => {
  const { id } = req.params
  const { page = 1, limit = 50 } = req.query || {}

  const pageNum = Math.max(parseInt(page, 10) || 1, 1)
  const perPage = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200)
  const skip = (pageNum - 1) * perPage

  const [items, total] = await Promise.all([
    PaymentTransaction.find({ order: id }).sort({ createdAt: -1 }).skip(skip).limit(perPage).lean(),
    PaymentTransaction.countDocuments({ order: id })
  ])

  res.json({ ok: true, items, page: pageNum, limit: perPage, total, hasMore: skip + items.length < total })
})

export const updatePaymentStatus = catchAsync(async (req, res) => {
  const { id } = req.params
  const { status: statusInput } = req.body || {}
  const status = String(statusInput || '').toUpperCase()
  const o = await Order.findById(id)
  if (!o) throw new ApiError(404, 'Order not found')
  // Map method-specific statuses (e.g., COD) to core statuses
  let canonical = status
  const method = String(o.payment?.method || '').toUpperCase()
  if (method === 'COD') {
    if (status === 'COD_PENDING') canonical = 'PENDING'
    if (status === 'COD_COLLECTED') canonical = 'PAID'
  }
  if (!PAYMENT_STATUSES.includes(canonical)) {
    throw new ApiError(400, `Invalid payment status: ${status}`)
  }
  
  // Use state manager for consistent payment status update
  const changes = updateOrderStates(o, { paymentStatus: canonical })
  applyStateChanges(o, changes)
  await o.save()
  // Log admin status change
  await PaymentTransaction.create({
    order: o._id,
    method: o.payment?.method,
    action: 'STATUS_UPDATED',
    status: canonical,
    amount: o.totals?.grandTotal,
    currency: 'LKR',
    notes: 'Payment status updated by admin',
    createdBy: 'admin'
  })

  // Persist refund state into Refund collection for refund-related statuses
  const isRefundPending = canonical === PAYMENT_STATES.REFUND_PENDING
  const isRefunded = canonical === PAYMENT_STATES.REFUNDED
  const isFailed = canonical === PAYMENT_STATES.FAILED
  if (isRefundPending || isRefunded || isFailed) {
    const base = {
      order: o._id,
      method: o.payment?.method,
      amount: o.totals?.grandTotal,
      currency: 'LKR'
    }
    if (isRefundPending) {
      await Refund.findOneAndUpdate(
        { order: o._id },
        { ...base, status: 'REQUESTED', requestedAt: new Date(), notes: 'Refund pending (payment.status)' },
        { upsert: true }
      )
    }
    if (isRefunded) {
      await Refund.findOneAndUpdate(
        { order: o._id },
        { ...base, status: 'PROCESSED', processedAt: new Date(), notes: 'Refund processed (payment.status=REFUNDED)' },
        { upsert: true }
      )
    }
    if (isFailed) {
      // Only mark refund failed if a refund process exists and not already processed
      await Refund.findOneAndUpdate(
        { order: o._id, status: { $ne: 'PROCESSED' } },
        { ...base, status: 'FAILED', failedAt: new Date(), notes: 'Refund failed (payment.status=FAILED)' },
        { upsert: true }
      )
    }
  }
  res.json({ ok: true, order: o })
})
export const deletePayment = catchAsync(async (req, res) => {
  const { id } = req.params
  const o = await Order.findById(id)
  if (!o) throw new ApiError(404, 'Order not found')

  await Promise.all([
    PaymentTransaction.deleteMany({ order: o._id }),
    Refund.deleteMany({ order: o._id })
  ])
  await o.deleteOne()
  res.json({ ok: true, deleted: 1 })
})

// Bulk delete payments by ids
export const bulkDeletePayments = catchAsync(async (req, res) => {
  const { ids } = req.body || {}
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new ApiError(400, 'ids array required')
  }
  const validIds = ids
    .map(String)
    .filter(id => mongoose.Types.ObjectId.isValid(id))
    .map(id => new mongoose.Types.ObjectId(id))
  if (validIds.length === 0) {
    throw new ApiError(400, 'No valid ids provided')
  }

  const orders = await Order.find({ _id: { $in: validIds } }, { _id: 1 }).lean()
  const orderIds = orders.map(o => o._id)
  if (orderIds.length === 0) return res.json({ ok: true, deleted: 0 })

  await Promise.all([
    PaymentTransaction.deleteMany({ order: { $in: orderIds } }),
    Refund.deleteMany({ order: { $in: orderIds } }),
    Order.deleteMany({ _id: { $in: orderIds } })
  ])
  res.json({ ok: true, deleted: orderIds.length })
})