import Product from '../models/Product.js'
import Order from '../models/Order.js'
import ApiError from '../../utils/ApiError.js'
import catchAsync from '../../utils/catchAsync.js'
import mongoose from 'mongoose'
import User from '../models/User.js'
import { getInitialStates, PAYMENT_METHODS, updateOrderStates, applyStateChanges } from '../../utils/stateManager.js'
import PaymentTransaction from '../models/PaymentTransaction.js'
import { checkoutAction, buildRequestHash } from '../../services/payhere.js'

function calcTotals(items) {
  const subtotal = items.reduce((s, it) => s + (it.price * it.quantity), 0)
  const shipping = 0
  const discount = 0
  const grandTotal = subtotal + shipping - discount
  return { subtotal, shipping, discount, grandTotal }
}

// POST /api/orders
export const placeOrder = catchAsync(async (req, res) => {
  const { method, address, addressId, items } = req.body
  if (!['COD','CARD','BANK'].includes(method)) throw new ApiError(400, 'Invalid payment method')

  // build order items from product snapshot
  const bySlug = new Map(items.map(i => [i.slug, i.quantity]))
  const prods = await Product.find({ slug: { $in: Array.from(bySlug.keys()) } })
  if (prods.length !== bySlug.size) throw new ApiError(400, 'One or more products not found')

  const orderItems = prods.map(p => {
    const qty = bySlug.get(p.slug)
    const unit = p.discountPercent ? Math.round((p.price * (1 - p.discountPercent/100)) * 100)/100 : p.price
    return {
      product: p._id,
      slug: p.slug,
      name: p.name,
      image: p.images?.[0],
      color: p.color,
      price: unit,
      quantity: qty
    }
  })

  const totals = calcTotals(orderItems)

  // Resolve address: prefer explicit snapshot; else use saved address by id; else use user's default
  let addr = address
  let currentUser = null
  if (!addr) {
    currentUser = await User.findById(req.user.sub)
    if (!currentUser) throw new ApiError(400, 'User not found')
    if (addressId) {
      const found = currentUser.addresses.id(addressId)
      if (!found) throw new ApiError(400, 'Saved address not found')
      addr = found.toObject()
    } else {
      const def = currentUser.addresses.find(a => a.isDefault) || currentUser.addresses[0]
      if (!def) throw new ApiError(400, 'No address provided and no saved address found')
      addr = def.toObject()
    }
  } else {
    // If address is directly provided, still fetch the user minimal info for PayHere fields
    currentUser = await User.findById(req.user.sub)
  }

  // If CARD and not yet confirmed, return a preview and require confirmation (two-step)
  const { confirm: confirmCard } = req.body || {}
  if (method === 'CARD' && confirmCard !== true) {
    return res.json({
      ok: true,
      requiresConfirmation: true,
      preview: {
        items: orderItems.map(i => ({ slug: i.slug, name: i.name, quantity: i.quantity, price: i.price })),
        totals,
        address: addr
      }
    })
  }

  // derive initial states & payment using state manager
  const initialStates = getInitialStates(method)
  const { orderState, deliveryState, paymentStatus, legacyStatus } = initialStates
  let payment = { method, status: paymentStatus }

  if (method === 'CARD') {
    payment.gateway = 'PAYHERE'
  }

  let order
  if (method === 'CARD') {
    // Do NOT decrement stock yet; create a pre-order awaiting payment
    order = await Order.create({
      user: req.user.sub,
      items: orderItems,
      address: addr,
      totals,
      status: legacyStatus, // proper legacy status
      orderState,
      deliveryState,
      statusHistory: [{ status: legacyStatus }],
      payment
    })
    // Log initial transaction
    await PaymentTransaction.create({
      order: order._id,
      method: 'CARD',
      action: 'CREATED',
      status: payment.status,
      amount: totals.grandTotal,
      currency: 'LKR',
      gateway: 'PAYHERE',
      notes: 'Order created awaiting card payment',
      createdBy: 'user'
    })
  } else {
    // Atomically reserve stock for non-card methods
    const session = await mongoose.startSession()
    await session.withTransaction(async () => {
      const ops = orderItems.map(oi => ({
        updateOne: {
          filter: { _id: oi.product, stock: { $gte: oi.quantity } },
          update: { $inc: { stock: -oi.quantity } }
        }
      }))
      const resBulk = await Product.bulkWrite(ops, { session })
      if (resBulk.modifiedCount !== orderItems.length) {
        throw new ApiError(400, 'One or more items are out of stock')
      }

      const created = await Order.create([{
        user: req.user.sub,
        items: orderItems,
        address: addr,
        totals,
        status: legacyStatus, // proper legacy status
        orderState,
        deliveryState,
        statusHistory: [{ status: legacyStatus }],
        payment
      }], { session })
      order = created[0]
    })
    session.endSession()
    // Log initial transaction for COD/BANK
    await PaymentTransaction.create({
      order: order._id,
      method,
      action: 'CREATED',
      status: payment.status,
      amount: totals.grandTotal,
      currency: 'LKR',
      notes: method === 'COD' ? 'Order created (COD)' : 'Order created awaiting bank slip',
      createdBy: 'user'
    })
  }

  // For CARD: return payload to be used by PayHere JS SDK popup (or fallback form)
  let payhere = null
  if (method === 'CARD') {
    // Build PayHere request (sandbox/live) with required hash strictly from env
    const merchantId = process.env.PAYHERE_MERCHANT_ID
    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET
    if (!merchantId || !merchantSecret) {
      throw new ApiError(500, 'PayHere credentials are not configured')
    }
    const orderId = String(order._id)
    const currency = 'LKR'
    const amount = Number(totals.grandTotal).toFixed(2)

    payhere = {
      sandbox: process.env.NODE_ENV === 'production' ? false : true,
      action: checkoutAction(process.env.NODE_ENV === 'production'), // for potential fallback form
      params: {
        merchant_id: merchantId,
        return_url: process.env.PAYHERE_RETURN_URL || 'http://localhost:5173/orders',
        cancel_url: process.env.PAYHERE_CANCEL_URL || 'http://localhost:5173/checkout',
        notify_url: process.env.PAYHERE_NOTIFY_URL || 'http://localhost:4000/api/payments/payhere/webhook',
        order_id: orderId,
        items: `Order ${orderId}`,
        currency,
        amount,
        first_name: currentUser?.firstName || 'Customer',
        last_name: currentUser?.lastName || '',
        email: currentUser?.email || 'no-reply@example.com',
        phone: addr.phone || '',
        address: `${addr.line1} ${addr.line2 || ''}`.trim(),
        city: addr.city,
        country: addr.country,
        // signature required by PayHere
        hash: buildRequestHash({ merchantId, merchantSecret, orderId, amount, currency })
      }
    }
  }

  res.status(201).json({ ok: true, orderId: order._id, payhere })
})

// GET /api/orders/me
export const listMyOrders = catchAsync(async (req, res) => {
  const items = await Order.find({ user: req.user.sub })
    .sort({ createdAt: -1 })
    .lean()
  res.json({ ok: true, items })
})

// GET /api/orders/:id
export const getOrder = catchAsync(async (req, res) => {
  const { id } = req.params
  const o = await Order.findOne({ _id: id, user: req.user.sub }).lean()
  if (!o) throw new ApiError(404, 'Order not found')
  res.json({ ok: true, order: o })
})

// PATCH /api/orders/:id/cancel
export const cancelMyOrder = catchAsync(async (req, res) => {
  const { id } = req.params
  const { reason } = req.body || {}
  const o = await Order.findOne({ _id: id, user: req.user.sub })
  if (!o) throw new ApiError(404, 'Order not found')

  // Allow cancellation only before dispatch
  if (String(o.deliveryState) !== 'NOT_DISPATCHED') {
    throw new ApiError(400, 'Cannot cancel after dispatch; request return process')
  }

  // Use state manager for consistent state updates
  const changes = updateOrderStates(o, {
    orderState: 'CANCELLED'
  })
  applyStateChanges(o, changes)
  o.deliveryMeta = o.deliveryMeta || {}
  o.deliveryMeta.reasons = o.deliveryMeta.reasons || {}
  if (reason) o.deliveryMeta.reasons.cancelled = { code: undefined, detail: String(reason) }
  await o.save()

  res.json({ ok: true, orderId: o._id, orderState: o.orderState })
})
