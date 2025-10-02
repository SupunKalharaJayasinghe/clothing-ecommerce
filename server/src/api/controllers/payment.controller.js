import Order from '../models/Order.js'
import Product from '../models/Product.js'
import ApiError from '../../utils/ApiError.js'
import catchAsync from '../../utils/catchAsync.js'
import mongoose from 'mongoose'
import crypto from 'crypto'
import { env } from '../../config/env.js'
import { PAYMENT_STATES, updateOrderStates, applyStateChanges, ORDER_STATES, getInitialStates } from '../../utils/stateManager.js'
import PaymentTransaction from '../models/PaymentTransaction.js'
import PaymentIntent from '../models/PaymentIntent.js'
import { sendInvoiceEmail } from '../../utils/invoiceEmail.js'

// BANK: POST /api/payments/bank/:orderId/slip
export const uploadBankSlip = catchAsync(async (req, res) => {
  const { orderId } = req.params
  if (!req.file) throw new ApiError(400, 'No slip uploaded')

  const order = await Order.findOne({ _id: orderId, user: req.user.sub })
  if (!order) throw new ApiError(404, 'Order not found')
  if (order.payment.method !== 'BANK') throw new ApiError(400, 'This order is not bank-transfer')

  const uploadedAt = new Date()
  const verifyBy = new Date(uploadedAt.getTime() + 72 * 60 * 60 * 1000) // 72h deadline
  order.payment.bank = {
    slipUrl: `/files/receipts/${req.file.filename}`,
    uploadedAt,
    verifiedAt: order.payment.bank?.verifiedAt || undefined,
    verifyBy
  }
  // Keep payment in PENDING status after upload
  if (order.payment.status !== PAYMENT_STATES.PAID) {
    order.payment.status = PAYMENT_STATES.PENDING
  }
  await order.save()

  // Log transaction
  await PaymentTransaction.create({
    order: order._id,
    method: 'BANK',
    action: 'SLIP_UPLOADED',
    status: order.payment.status,
    amount: order.totals?.grandTotal,
    currency: 'LKR',
    gateway: undefined,
    gatewayRef: undefined,
    notes: 'Bank slip uploaded',
    meta: { filename: req.file.filename, slipUrl: order.payment.bank.slipUrl, verifyBy }
  })

  res.json({ ok: true, orderId: order._id, slipUrl: order.payment.bank.slipUrl, verifyBy })
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
  let order = await Order.findById(orderId)
  let intent = null

  if (!order) {
    // No order yet? Treat order_id as PaymentIntent id for new flow
    intent = await PaymentIntent.findById(orderId)
    if (!intent) throw new ApiError(404, 'Order or payment intent not found')
  } else {
    if (order.payment?.method !== 'CARD') throw new ApiError(400, 'Not a card payment order')
    // idempotency: if already processed as paid/placed, acknowledge
    if (order.payment.status === 'paid' || order.status === 'placed') {
      return res.json({ ok: true, processed: true })
    }
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
    if (order) {
      const changes = updateOrderStates(order, { paymentStatus: PAYMENT_STATES.FAILED })
      applyStateChanges(order, changes)
      order.payment.gatewayRef = payment_id || order.payment.gatewayRef
      await order.save()
      // Log failed webhook
      await PaymentTransaction.create({
        order: order._id,
        method: 'CARD',
        action: 'WEBHOOK',
        status: PAYMENT_STATES.FAILED,
        amount: Number(payhere_amount) || undefined,
        currency: payhere_currency || undefined,
        gateway: 'PAYHERE',
        gatewayRef: payment_id || undefined,
        notes: 'Card payment failed',
        meta: { raw: req.body }
      })
    } else if (intent) {
      // Mark intent failed; no order is created
      intent.status = 'FAILED'
      await intent.save()
    }
    return res.json({ ok: true, paid: false })
  }

  // Success flow
  const session = await mongoose.startSession()
  await session.withTransaction(async () => {
    if (order) {
      // Pre-existing order (backward compatibility)
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
      const changes = updateOrderStates(order, {
        orderState: ORDER_STATES.CONFIRMED,
        paymentStatus: PAYMENT_STATES.PAID
      })
      applyStateChanges(order, changes)
      order.payment.gatewayRef = payment_id || order.payment.gatewayRef
      await order.save({ session })
    } else if (intent) {
      // New flow: create order only now
      // Ensure stock first
      const ops = intent.items.map(it => ({
        updateOne: {
          filter: { _id: it.product, stock: { $gte: it.quantity } },
          update: { $inc: { stock: -it.quantity } }
        }
      }))
      const resBulk = await Product.bulkWrite(ops, { session })
      if (resBulk.modifiedCount !== intent.items.length) {
        throw new ApiError(400, 'One or more items are out of stock at payment time')
      }

      const initial = getInitialStates('CARD')
      const created = await Order.create([{
        user: intent.user,
        items: intent.items,
        address: intent.address,
        totals: intent.totals,
        status: initial.legacyStatus,
        orderState: initial.orderState,
        deliveryState: initial.deliveryState,
        statusHistory: [{ status: initial.legacyStatus }],
        payment: { method: 'CARD', status: initial.paymentStatus, gateway: 'PAYHERE', gatewayRef: payment_id }
      }], { session })
      order = created[0]

      const changes = updateOrderStates(order, { paymentStatus: PAYMENT_STATES.PAID })
      applyStateChanges(order, changes)
      order.payment.gatewayRef = payment_id || order.payment.gatewayRef
      await order.save({ session })

      intent.status = 'PAID'
      intent.order = order._id
      intent.consumedAt = new Date()
      await intent.save({ session })
    }
  })
  session.endSession()

  // Log success webhook
  await PaymentTransaction.create({
    order: order._id,
    method: 'CARD',
    action: 'WEBHOOK',
    status: PAYMENT_STATES.PAID,
    amount: Number(payhere_amount) || order.totals?.grandTotal,
    currency: payhere_currency || 'LKR',
    gateway: 'PAYHERE',
    gatewayRef: payment_id || undefined,
    notes: intent ? 'Card payment captured via webhook (intent)' : 'Card payment captured via webhook',
    meta: { raw: req.body, intentId: intent ? String(intent._id) : undefined }
  })

  // Email invoice to customer after successful card payment
  try { await sendInvoiceEmail({ order }) } catch (e) { /* non-blocking */ }

res.json({ ok: true, paid: true })
})

// GET /api/payments/payhere/status/:id
// Returns whether a given id corresponds to a paid Order (CARD) or a consumed PaymentIntent
export const payhereStatus = catchAsync(async (req, res) => {
  const { id } = req.params
  if (!id) throw new ApiError(400, 'id required')

  // Try Order first (backward compatibility)
  let order = await Order.findOne({ _id: id, user: req.user.sub })
  if (order) {
    const method = order.payment?.method
    const paid = String(order.payment?.status || '').toUpperCase() === 'PAID'
    if (method !== 'CARD') return res.status(400).json({ ok: false, message: 'Not a card order' })
    return res.json({ ok: true, scope: 'order', paid, orderId: order._id })
  }

  // Else, check PaymentIntent
  const intent = await PaymentIntent.findOne({ _id: id, user: req.user.sub })
  if (!intent) throw new ApiError(404, 'Not found')

  const paid = String(intent.status || '').toUpperCase() === 'PAID'
  return res.json({ ok: true, scope: 'intent', paid, orderId: intent.order || undefined })
})
