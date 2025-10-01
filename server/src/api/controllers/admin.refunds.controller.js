import ApiError from '../../utils/ApiError.js'
import catchAsync from '../../utils/catchAsync.js'
import Order from '../models/Order.js'
import Refund from '../models/Refund.js'
import Return from '../models/Return.js'
import PaymentTransaction from '../models/PaymentTransaction.js'
import { sendMail } from '../../utils/mailer.js'
import { env } from '../../config/env.js'
import { sendRefundNotification, sendAdminRefundNotification } from '../../utils/refundNotifications.js'
import { processRefundByMethod } from '../../utils/payhereRefunds.js'

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

export const getRefundDetails = catchAsync(async (req, res) => {
  const { id } = req.params
  const refund = await Refund.findById(id)
    .populate({
      path: 'order',
      populate: {
        path: 'user',
        select: 'firstName lastName email username'
      }
    })
    .lean()
  if (!refund) {
    throw new ApiError(404, 'Refund not found')
  }
  
  // Include additional details for detailed report
  const refundDetails = {
    ...refund,
    customerName: refund.order?.user ? `${refund.order.user.firstName || ''} ${refund.order.user.lastName || ''}`.trim() : 'Guest',
    customerEmail: refund.order?.user?.email || 'N/A',
    orderId: refund.order?._id || 'N/A',
    orderTotal: refund.order?.totals?.grandTotal || 0,
    refundAmount: refund.amount || 0,
    refundStatus: refund.status || 'N/A',
    paymentMethod: refund.method || 'N/A'
  }
  
  res.json({ ok: true, refund: refundDetails })
})

// POST /admin/refunds - Create refund from return request
export const createRefund = catchAsync(async (req, res) => {
  const { orderId, amount, reason, refundMethod = 'ORIGINAL_PAYMENT', bankDetails } = req.body
  
  const order = await Order.findById(orderId).populate('user')
  if (!order) {
    throw new ApiError(404, 'Order not found')
  }
  
  // Check if order is eligible for refund
  const paid = String(order.payment?.status || '').toUpperCase() === 'PAID'
  if (!paid) {
    throw new ApiError(400, 'Order must be paid to process refund')
  }
  
  // Check if refund already exists
  const existingRefund = await Refund.findOne({ order: orderId })
  if (existingRefund) {
    throw new ApiError(400, 'Refund already exists for this order')
  }
  
  // Validate refund amount
  const maxRefund = order.totals?.grandTotal || 0
  if (amount > maxRefund) {
    throw new ApiError(400, `Refund amount cannot exceed order total (${maxRefund})`)
  }
  
  // Create refund record
  const refund = await Refund.create({
    order: orderId,
    method: order.payment.method,
    status: 'REQUESTED',
    amount: Number(amount),
    reason: String(reason || '').trim(),
    refundMethod,
    bankDetails: refundMethod === 'BANK_TRANSFER' ? bankDetails : undefined,
    requestedAt: new Date(),
    requestedBy: order.user._id
  })
  
  // Log transaction
  await PaymentTransaction.create({
    order: orderId,
    method: order.payment.method,
    action: 'REFUND_REQUESTED',
    status: 'REQUESTED',
    amount: Number(amount),
    currency: 'LKR',
    notes: `Refund requested: ${reason || 'No reason provided'}`,
    createdBy: 'admin'
  })
  
  // Update order payment status
  order.payment.status = 'REFUND_PENDING'
  await order.save()
  
  // Send notifications
  await sendRefundNotification(refund, order, 'CREATED')
  await sendAdminRefundNotification(refund, order, 'NEW_REQUEST')
  
  // Check for high-value refunds
  if (refund.amount > (env.HIGH_VALUE_REFUND_THRESHOLD || 10000)) {
    await sendAdminRefundNotification(refund, order, 'HIGH_VALUE')
  }
  
  res.status(201).json({ ok: true, refund })
})

// PATCH /admin/refunds/:id/approve - Approve refund
export const approveRefund = catchAsync(async (req, res) => {
  const { id } = req.params
  const { adminNotes } = req.body
  
  const refund = await Refund.findById(id).populate('order')
  if (!refund) {
    throw new ApiError(404, 'Refund not found')
  }
  
  if (refund.status !== 'REQUESTED') {
    throw new ApiError(400, 'Refund can only be approved from REQUESTED status')
  }
  
  // Update refund status
  refund.status = 'APPROVED'
  refund.approvedAt = new Date()
  refund.approvedBy = req.admin?.id
  if (adminNotes) refund.adminNotes = String(adminNotes).trim()
  await refund.save()
  
  // Log transaction
  await PaymentTransaction.create({
    order: refund.order._id,
    method: refund.method,
    action: 'REFUND_APPROVED',
    status: 'APPROVED',
    amount: refund.amount,
    currency: 'LKR',
    notes: `Refund approved by admin: ${adminNotes || 'No notes'}`,
    createdBy: 'admin'
  })
  
  // Send notification
  await sendRefundNotification(refund, refund.order, 'APPROVED')
  
  res.json({ ok: true, refund })
})

// PATCH /admin/refunds/:id/process - Process refund (mark as completed)
export const processRefund = catchAsync(async (req, res) => {
  const { id } = req.params
  const { gatewayRefundId, gatewayResponse, adminNotes, autoProcess = false } = req.body
  
  const refund = await Refund.findById(id).populate('order')
  if (!refund) {
    throw new ApiError(404, 'Refund not found')
  }
  
  if (!['APPROVED', 'PROCESSING'].includes(refund.status)) {
    throw new ApiError(400, 'Refund must be approved before processing')
  }
  
  let processResult = null
  
  // Auto-process through payment gateway if requested
  if (autoProcess) {
    try {
      refund.status = 'PROCESSING'
      await refund.save()
      
      processResult = await processRefundByMethod(refund, refund.order, req.body)
      
      if (processResult.success) {
        refund.gatewayRefundId = processResult.gatewayRefundId
        refund.gatewayResponse = processResult.gatewayResponse
        refund.status = 'PROCESSED'
      } else {
        refund.status = 'FAILED'
        refund.gatewayResponse = processResult.gatewayResponse || { error: processResult.error }
        await refund.save()
        throw new ApiError(400, `Refund processing failed: ${processResult.error || processResult.message}`)
      }
    } catch (error) {
      refund.status = 'FAILED'
      refund.gatewayResponse = { error: error.message }
      await refund.save()
      throw error
    }
  } else {
    // Manual processing
    refund.status = 'PROCESSED'
    if (gatewayRefundId) refund.gatewayRefundId = String(gatewayRefundId)
    if (gatewayResponse) refund.gatewayResponse = gatewayResponse
  }
  
  // Update refund record
  refund.processedAt = new Date()
  refund.processedBy = req.admin?.id
  if (adminNotes) refund.adminNotes = String(adminNotes).trim()
  await refund.save()
  
  // Update order payment status
  const order = refund.order
  order.payment.status = 'REFUNDED'
  await order.save()
  
  // Log transaction
  await PaymentTransaction.create({
    order: order._id,
    method: refund.method,
    action: 'REFUND_PROCESSED',
    status: 'PROCESSED',
    amount: refund.amount,
    currency: 'LKR',
    gatewayRef: refund.gatewayRefundId,
    notes: `Refund processed: ${adminNotes || 'Auto-processed through gateway'}`,
    createdBy: 'admin'
  })
  
  // Send notification
  await sendRefundNotification(refund, order, 'PROCESSED')
  
  res.json({ 
    ok: true, 
    refund,
    processResult: autoProcess ? processResult : null
  })
})

// PATCH /admin/refunds/:id/reject - Reject refund
export const rejectRefund = catchAsync(async (req, res) => {
  const { id } = req.params
  const { reason, adminNotes } = req.body
  
  if (!reason?.trim()) {
    throw new ApiError(400, 'Rejection reason is required')
  }
  
  const refund = await Refund.findById(id).populate('order')
  if (!refund) {
    throw new ApiError(404, 'Refund not found')
  }
  
  if (!['REQUESTED', 'APPROVED'].includes(refund.status)) {
    throw new ApiError(400, 'Cannot reject refund in current status')
  }
  
  // Update refund status
  refund.status = 'CANCELLED'
  refund.cancelledAt = new Date()
  refund.reason = String(reason).trim()
  if (adminNotes) refund.adminNotes = String(adminNotes).trim()
  await refund.save()
  
  // Update order payment status back to PAID
  const order = refund.order
  order.payment.status = 'PAID'
  await order.save()
  
  // Log transaction
  await PaymentTransaction.create({
    order: order._id,
    method: refund.method,
    action: 'REFUND_REJECTED',
    status: 'CANCELLED',
    amount: refund.amount,
    currency: 'LKR',
    notes: `Refund rejected: ${reason}`,
    createdBy: 'admin'
  })
  
  // Send notification
  await sendRefundNotification(refund, order, 'REJECTED')
  
  res.json({ ok: true, refund })
})

// GET /admin/refunds/stats - Get refund statistics
export const getRefundStats = catchAsync(async (req, res) => {
  const { period = '30d' } = req.query
  
  // Calculate date range
  const now = new Date()
  let startDate = new Date()
  
  switch (period) {
    case '7d':
      startDate.setDate(now.getDate() - 7)
      break
    case '30d':
      startDate.setDate(now.getDate() - 30)
      break
    case '90d':
      startDate.setDate(now.getDate() - 90)
      break
    case '1y':
      startDate.setFullYear(now.getFullYear() - 1)
      break
    default:
      startDate.setDate(now.getDate() - 30)
  }
  
  const [
    totalRefunds,
    pendingRefunds,
    processedRefunds,
    totalAmount,
    refundsByStatus,
    refundsByMethod
  ] = await Promise.all([
    Refund.countDocuments({ createdAt: { $gte: startDate } }),
    Refund.countDocuments({ status: 'REQUESTED', createdAt: { $gte: startDate } }),
    Refund.countDocuments({ status: 'PROCESSED', createdAt: { $gte: startDate } }),
    Refund.aggregate([
      { $match: { status: 'PROCESSED', createdAt: { $gte: startDate } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    Refund.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),
    Refund.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: '$method', count: { $sum: 1 }, amount: { $sum: '$amount' } } }
    ])
  ])
  
  const stats = {
    period,
    totalRefunds,
    pendingRefunds,
    processedRefunds,
    totalAmount: totalAmount[0]?.total || 0,
    refundsByStatus: refundsByStatus.reduce((acc, item) => {
      acc[item._id] = item.count
      return acc
    }, {}),
    refundsByMethod: refundsByMethod.reduce((acc, item) => {
      acc[item._id] = { count: item.count, amount: item.amount }
      return acc
    }, {})
  }
  
  res.json({ ok: true, stats })
})
