import ApiError from '../../utils/ApiError.js'
import catchAsync from '../../utils/catchAsync.js'
import Order from '../models/Order.js'
import { PAYMENT_STATES, updateOrderStates, applyStateChanges } from '../../utils/stateManager.js'
import PaymentTransaction from '../models/PaymentTransaction.js'
import Refund from '../models/Refund.js'
import { sendInvoiceEmail } from '../../utils/invoiceEmail.js'

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
  // Log admin status change
  await PaymentTransaction.create({
    order: o._id,
    method: o.payment?.method,
    action: 'STATUS_UPDATED',
    status,
    amount: o.totals?.grandTotal,
    currency: 'LKR',
    notes: 'Payment status updated by admin',
    createdBy: 'admin'
  })

  // Persist refund state into Refund collection for refund-related statuses
  const isRefundPending = status === PAYMENT_STATES.REFUND_PENDING
  const isRefunded = status === PAYMENT_STATES.REFUNDED
  const isFailed = status === PAYMENT_STATES.FAILED
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