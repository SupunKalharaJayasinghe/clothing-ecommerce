import Order from '../models/Order.js'
import ApiError from '../../utils/ApiError.js'
import catchAsync from '../../utils/catchAsync.js'

// BANK: POST /api/payments/bank/:orderId/slip
export const uploadBankSlip = catchAsync(async (req, res) => {
  const { orderId } = req.params
  if (!req.file) throw new ApiError(400, 'No slip uploaded')

  const order = await Order.findOne({ _id: orderId, user: req.user.sub })
  if (!order) throw new ApiError(404, 'Order not found')
  if (order.payment.method !== 'BANK') throw new ApiError(400, 'This order is not bank-transfer')

  order.payment.bank = {
    slipUrl: `/files/receipts/${req.file.filename}`,
    uploadedAt: new Date(),
    verifiedAt: order.payment.bank?.verifiedAt || undefined
  }
  await order.save()

  res.json({ ok: true, orderId: order._id, slipUrl: order.payment.bank.slipUrl })
})
