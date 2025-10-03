import ApiError from '../../utils/ApiError.js'
import catchAsync from '../../utils/catchAsync.js'
import Order from '../models/Order.js'
import Refund from '../models/Refund.js'
import PaymentTransaction from '../models/PaymentTransaction.js'
import { sendRefundNotification, sendAdminRefundNotification } from '../../utils/refundNotifications.js'
import { env } from '../../config/env.js'

// GET /api/refunds/me - Get user's refunds
export const getMyRefunds = catchAsync(async (req, res) => {
  const { page = 1, limit = 20 } = req.query
  
  const pageNum = Math.max(parseInt(page, 10) || 1, 1)
  const perPage = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100)
  const skip = (pageNum - 1) * perPage
  
  // Find orders for this user that have refunds
  const userOrders = await Order.find({ user: req.user.sub }).select('_id').lean()
  const orderIds = userOrders.map(o => o._id)
  
  const [refunds, total] = await Promise.all([
    Refund.find({ order: { $in: orderIds } })
      .populate({
        path: 'order',
        select: '_id createdAt totals items'
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(perPage)
      .lean(),
    Refund.countDocuments({ order: { $in: orderIds } })
  ])
  
  res.json({ 
    ok: true, 
    items: refunds, 
    page: pageNum, 
    limit: perPage, 
    total, 
    hasMore: skip + refunds.length < total 
  })
})

// GET /api/refunds/:id - Get specific refund details
export const getRefundDetails = catchAsync(async (req, res) => {
  const { id } = req.params
  
  const refund = await Refund.findById(id)
    .populate({
      path: 'order',
      select: '_id createdAt totals items user',
      populate: {
        path: 'user',
        select: '_id'
      }
    })
    .lean()
  
  if (!refund) {
    throw new ApiError(404, 'Refund not found')
  }
  
  // Ensure user can only access their own refunds
  if (String(refund.order?.user?._id) !== String(req.user.sub)) {
    throw new ApiError(403, 'Access denied')
  }
  
  res.json({ ok: true, refund })
})

// GET /api/refunds/stats - Get user's refund statistics
export const getMyRefundStats = catchAsync(async (req, res) => {
  // Find orders for this user
  const userOrders = await Order.find({ user: req.user.sub }).select('_id').lean()
  const orderIds = userOrders.map(o => o._id)
  
  const [
    totalRefunds,
    pendingRefunds,
    processedRefunds,
    totalRefundAmount,
    refundsByStatus
  ] = await Promise.all([
    Refund.countDocuments({ order: { $in: orderIds } }),
    Refund.countDocuments({ order: { $in: orderIds }, status: 'REQUESTED' }),
    Refund.countDocuments({ order: { $in: orderIds }, status: 'PROCESSED' }),
    Refund.aggregate([
      { $match: { order: { $in: orderIds }, status: 'PROCESSED' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    Refund.aggregate([
      { $match: { order: { $in: orderIds } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ])
  ])
  
  const stats = {
    totalRefunds,
    pendingRefunds,
    processedRefunds,
    totalRefundAmount: totalRefundAmount[0]?.total || 0,
    refundsByStatus: refundsByStatus.reduce((acc, item) => {
      acc[item._id] = item.count
      return acc
    }, {})
  }
  
  res.json({ ok: true, stats })
})

// POST /api/refunds/request - Customer requests a refund (requires approved return)
export const requestRefund = catchAsync(async (req, res) => {
  const { orderId, amount, reason, refundMethod = 'ORIGINAL_PAYMENT', bankDetails } = req.body || {}

  if (!orderId) throw new ApiError(400, 'orderId is required')

  // Ensure order exists and belongs to user
  const order = await Order.findById(orderId).populate('user')
  if (!order) throw new ApiError(404, 'Order not found')
  if (String(order.user?._id) !== String(req.user.sub)) {
    throw new ApiError(403, 'Access denied')
  }

  // Require an approved return (or received/closed) before allowing refund request
  const rStatus = String(order.returnRequest?.status || '').toLowerCase()
  if (!['approved', 'received', 'closed'].includes(rStatus)) {
    throw new ApiError(400, 'Return must be approved before requesting a refund')
  }

  // Ensure order was paid
  const paid = String(order.payment?.status || '').toUpperCase() === 'PAID'
  if (!paid) throw new ApiError(400, 'Order must be paid to process refund')

  // Prevent duplicate refund
  const existingRefund = await Refund.findOne({ order: orderId })
  if (existingRefund) {
    throw new ApiError(400, 'Refund already exists for this order')
  }

  // Validate amount
  const maxRefund = order.totals?.grandTotal || 0
  const amountNum = Number(amount)
  if (!Number.isFinite(amountNum) || amountNum < 0) {
    throw new ApiError(400, 'Invalid refund amount')
  }
  if (amountNum > maxRefund) {
    throw new ApiError(400, `Refund amount cannot exceed order total (${maxRefund})`)
  }

  // Create refund record
  const refund = await Refund.create({
    order: orderId,
    method: order.payment.method,
    status: 'REQUESTED',
    amount: amountNum,
    reason: String(reason || '').trim() || undefined,
    refundMethod,
    bankDetails: refundMethod === 'BANK_TRANSFER' ? bankDetails : undefined,
    requestedAt: new Date(),
    requestedBy: req.user.sub
  })

  // Log payment transaction
  await PaymentTransaction.create({
    order: orderId,
    method: order.payment.method,
    action: 'REFUND_REQUESTED',
    status: 'REQUESTED',
    amount: amountNum,
    currency: 'LKR',
    notes: `Refund requested by customer: ${reason || 'No reason provided'}`,
    createdBy: 'user'
  })

  // Update order payment status
  order.payment.status = 'REFUND_PENDING'
  await order.save()

  // Notifications
  await sendRefundNotification(refund, order, 'CREATED')
  await sendAdminRefundNotification(refund, order, 'NEW_REQUEST')
  if (refund.amount > (env.HIGH_VALUE_REFUND_THRESHOLD || 10000)) {
    await sendAdminRefundNotification(refund, order, 'HIGH_VALUE')
  }

  res.status(201).json({ ok: true, refund })
})
