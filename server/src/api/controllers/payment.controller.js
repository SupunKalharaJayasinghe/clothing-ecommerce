import Order from '../models/Order.js'
import Product from '../models/Product.js'
import ApiError from '../../utils/ApiError.js'
import catchAsync from '../../utils/catchAsync.js'
import mongoose from 'mongoose'
import crypto from 'crypto'
import { env } from '../../config/env.js'

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

// CARD: POST /api/payments/payhere/webhook
// NOTE: In production verify md5sig and merchant_id properly.
export const payhereWebhook = catchAsync(async (req, res) => {
  const {
    order_id: orderId,
    payment_id,
    status_code, // '2' for success on PayHere
    status,      // sometimes textual
    merchant_id,
    payhere_amount,
    payhere_currency,
    md5sig
  } = req.body || {}

  if (!orderId) throw new ApiError(400, 'order_id required')
  const order = await Order.findById(orderId)
  if (!order) throw new ApiError(404, 'Order not found')
  if (order.payment?.method !== 'CARD') throw new ApiError(400, 'Not a card payment order')

  // idempotency: if already processed as paid/placed, acknowledge
  if (order.payment.status === 'paid' || order.status === 'placed') {
    return res.json({ ok: true, processed: true })
  }

  // Verify md5 signature if merchant secret is configured
  if (env.PAYHERE_MERCHANT_SECRET) {
    const merchantSecretHash = crypto.createHash('md5').update(env.PAYHERE_MERCHANT_SECRET).digest('hex').toUpperCase()
    const local = crypto
      .createHash('md5')
      .update(String(merchant_id || ''))
      .update(String(orderId || ''))
      .update(String(payhere_amount || ''))
      .update(String(payhere_currency || ''))
      .update(String(status_code || ''))
      .update(merchantSecretHash)
      .digest('hex')
      .toUpperCase()
    if (!md5sig || local !== String(md5sig).toUpperCase()) {
      return res.status(400).json({ ok: false, message: 'Invalid signature' })
    }
  }

  const success = String(status_code) === '2' || String(status).toUpperCase() === 'SUCCESS'

  if (!success) {
    order.payment.status = 'failed'
    order.payment.gatewayRef = payment_id || order.payment.gatewayRef
    await order.save()
    return res.json({ ok: true, paid: false })
  }

  // On success: decrement stock and mark order placed atomically
  const session = await mongoose.startSession()
  await session.withTransaction(async () => {
    // ensure sufficient stock (might have changed between pre-order and payment)
    const ops = order.items.map(it => ({
      updateOne: {
        filter: { _id: it.product, stock: { $gte: it.quantity } },
        update: { $inc: { stock: -it.quantity } }
      }
    }))
    const resBulk = await Product.bulkWrite(ops, { session })
    if (resBulk.modifiedCount !== order.items.length) {
      throw new ApiError(400, 'One or more items are out of stock at payment time')
    }

    order.status = 'placed'
    order.statusHistory = (order.statusHistory || []).concat([{ status: 'placed', at: new Date() }])
    order.payment.status = 'paid'
    order.payment.gatewayRef = payment_id || order.payment.gatewayRef
    await order.save({ session })
  })
  session.endSession()

  res.json({ ok: true, paid: true })
})
