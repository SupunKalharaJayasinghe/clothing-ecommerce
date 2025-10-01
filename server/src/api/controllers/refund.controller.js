import ApiError from '../../utils/ApiError.js'
import catchAsync from '../../utils/catchAsync.js'
import Order from '../models/Order.js'
import Refund from '../models/Refund.js'

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
