import catchAsync from '../../utils/catchAsync.js'
import Order from '../models/Order.js'
import Return from '../models/Return.js'
import Refund from '../models/Refund.js'

function toMap(list) {
  const m = {}
  for (const row of list) {
    const key = row._id || 'unknown'
    m[key] = row.count
  }
  return m
}

export const getStats = catchAsync(async (_req, res) => {
  const [orderStates, deliveryStates, paymentStatuses, returnStatuses, refundStatuses] = await Promise.all([
    Order.aggregate([{ $group: { _id: '$orderState', count: { $sum: 1 } } }]),
    Order.aggregate([{ $group: { _id: '$deliveryState', count: { $sum: 1 } } }]),
    Order.aggregate([{ $group: { _id: '$payment.status', count: { $sum: 1 } } }]),
    Return.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Refund.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])
  ])

  res.json({
    ok: true,
    ordersByOrderState: toMap(orderStates),
    ordersByDeliveryState: toMap(deliveryStates),
    paymentsByStatus: toMap(paymentStatuses),
    returnsByStatus: toMap(returnStatuses),
    refundsByStatus: toMap(refundStatuses)
  })
})
