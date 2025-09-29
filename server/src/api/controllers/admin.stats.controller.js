import catchAsync from '../../utils/catchAsync.js'
import Order from '../models/Order.js'
import Refund from '../models/Refund.js'
import Return from '../models/Return.js'

function toMap(pairs, keyName = '_id') {
  const out = {}
  for (const row of pairs) {
    const key = row[keyName] || 'UNKNOWN'
    out[key] = row.count || 0
  }
  return out
}

export const getAdminStats = catchAsync(async (_req, res) => {
  const [ordersByOrderStateAgg, paymentsByStatusAgg, returnsByStatusAgg, refundsByStatusAgg] = await Promise.all([
    Order.aggregate([{ $group: { _id: '$orderState', count: { $sum: 1 } } }]),
    Order.aggregate([{ $group: { _id: '$payment.status', count: { $sum: 1 } } }]),
    Return.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Refund.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])
  ])

  const data = {
    ordersByOrderState: toMap(ordersByOrderStateAgg),
    paymentsByStatus: toMap(paymentsByStatusAgg),
    returnsByStatus: toMap(returnsByStatusAgg),
    refundsByStatus: toMap(refundsByStatusAgg)
  }

  res.json({ ok: true, ...data })
})
