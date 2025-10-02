import Product from '../models/Product.js'
import Order from '../models/Order.js'
import ApiError from '../../utils/ApiError.js'
import catchAsync from '../../utils/catchAsync.js'
import mongoose from 'mongoose'
import User from '../models/User.js'
import PaymentIntent from '../models/PaymentIntent.js'
import { getInitialStates, PAYMENT_METHODS, updateOrderStates, applyStateChanges } from '../../utils/stateManager.js'
import PaymentTransaction from '../models/PaymentTransaction.js'
import { env } from '../../config/env.js'
import { sendMail } from '../../utils/mailer.js'
import { buildPayHereCheckout } from '../../utils/payhere.js'
import { sendInvoiceEmail } from '../../utils/invoiceEmail.js'

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
  if (!addr) {
    const user = await User.findById(req.user.sub)
    if (addressId) {
      const found = user.addresses.id(addressId)
      if (!found) throw new ApiError(400, 'Saved address not found')
      addr = found.toObject()
    } else {
      const def = user.addresses.find(a => a.isDefault) || user.addresses[0]
      if (!def) throw new ApiError(400, 'No address provided and no saved address found')
      addr = def.toObject()
    }
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
    // For CARD: do not create an Order yet. Create a PaymentIntent snapshot and redirect to gateway.
    const intent = await PaymentIntent.create({
      user: req.user.sub,
      method: 'CARD',
      gateway: 'PAYHERE',
      status: 'PENDING',
      items: orderItems,
      address: addr,
      totals
    })

    // Build PayHere checkout using intent id as order_id
    const userDoc = await User.findById(req.user.sub).select('email name').lean()
    const payhere = buildPayHereCheckout({
      order: { _id: intent._id, totals: { grandTotal: totals.grandTotal } },
      address: addr,
      user: userDoc
    })

    return res.status(201).json({ ok: true, payhere })
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
    // Send invoice to user email for COD orders immediately
    if (method === 'COD') {
      try { await sendInvoiceEmail({ order }) } catch (e) { /* non-blocking */ }
    }
  }

  // For CARD: return minimal payload you can use to build a PayHere form client-side (sandbox)
  let payhere = null
  if (method === 'CARD') {
    const userDoc = await User.findById(req.user.sub).select('email name').lean()
    payhere = buildPayHereCheckout({ order, address: addr, user: userDoc })
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

// POST /api/orders/:id/return-request
// Customer-initiated return: allowed only if delivered and paid
export const requestReturn = catchAsync(async (req, res) => {
  const { id } = req.params
  const { reason, description, items } = req.body || {}

  const o = await Order.findOne({ _id: id, user: req.user.sub })
  if (!o) throw new ApiError(404, 'Order not found')

  const paid = String(o.payment?.status || '').toUpperCase() === 'PAID'
  const delivered = (
    String(o.deliveryState || '').toUpperCase() === 'DELIVERED' ||
    String(o.orderState || '').toUpperCase() === 'DELIVERED' ||
    String(o.status || '').toUpperCase() === 'COMPLETED' ||
    String(o.status || '').toUpperCase() === 'DELIVERED'
  )

  // Determine deliveredAt for window enforcement
  function getDeliveredAt(order) {
    const evAt = order.deliveryMeta?.evidence?.delivered?.at
    if (evAt) return new Date(evAt)
    const hist = Array.isArray(order.statusHistory) ? order.statusHistory : []
    for (let i = hist.length - 1; i >= 0; i--) {
      const s = String(hist[i]?.status || '').toUpperCase()
      if (s.includes('DELIVERED') || s === 'COMPLETED') return new Date(hist[i]?.at || order.updatedAt || order.createdAt)
    }
    return new Date(order.updatedAt || order.createdAt)
  }
  if (!(paid && delivered)) {
    throw new ApiError(400, 'Return allowed only after delivery and successful payment')
  }
  const deliveredAt = getDeliveredAt(o)
  const daysSince = Math.floor((Date.now() - deliveredAt.getTime()) / (24*3600*1000))
  if (daysSince > env.RETURN_WINDOW_DAYS) {
    throw new ApiError(400, `Return window expired (${env.RETURN_WINDOW_DAYS} days after delivery)`) 
  }
  if (o.returnRequest?.status) {
    throw new ApiError(400, 'Return already requested for this order')
  }

  // Validate items against order items
  const bySlug = new Map((o.items || []).map(i => [String(i.slug), i]))
  const selected = []
  for (const it of items || []) {
    const slug = typeof it === 'string' ? it : it?.slug
    const s = bySlug.get(String(slug))
    if (!s) throw new ApiError(400, `Invalid item: ${slug}`)
    // Business rule: users cannot change quantity; return full ordered qty for selected item
    const qty = Number(s.quantity || 0)
    if (qty < 1) throw new ApiError(400, `Invalid quantity for ${slug}`)
    selected.push({
      product: s.product,
      slug: s.slug,
      name: s.name,
      quantity: qty,
      price: s.price,
      reason: String(reason || '').trim() || 'No reason provided',
      // condition defaults via schema
    })
  }
  if (!selected.length) throw new ApiError(400, 'No items selected for return')

  // Mark order with returnRequest (lowercase status to match admin filters)
  o.returnRequest = {
    status: 'requested',
    reason: String(reason || '').trim() || undefined,
    requestedAt: new Date(),
    updatedAt: new Date()
  }
  await o.save()

  // Upsert into Return collection with item-level detail (lowercase status per admin usage)
  const { default: Return } = await import('../models/Return.js')
  const photos = (req.files || []).map(f => `/files/returns/${f.filename}`)
  const retDoc = await Return.findOneAndUpdate(
    { order: o._id },
    {
      order: o._id,
      user: o.user,
      items: selected,
      status: 'requested',
      reason: String(reason || '').trim() || undefined,
      customerNotes: String(description || reason || '').trim() || undefined,
      photos,
      requestedAt: o.returnRequest.requestedAt,
      updatedAt: o.returnRequest.updatedAt
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )

  // Notify return manager (optional)
  if (env.RETURN_NOTIFY_EMAIL) {
    const subject = `New return request: Order ${String(o._id).slice(-8)}`
    const text = `Order ${o._id} requested return with ${selected.length} item(s). Reason: ${reason || ''}`
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;">
        <h3>New Return Request</h3>
        <p><strong>Order:</strong> ${o._id}</p>
        <p><strong>User:</strong> ${o.user}</p>
        <p><strong>Reason:</strong> ${reason || ''}</p>
        <p><strong>Description:</strong> ${(description || reason || '')}</p>
        <p><strong>Items:</strong></p>
        <ul>${selected.map(it => `<li>${it.slug} × ${it.quantity}</li>`).join('')}</ul>
      </div>
    `
    try { await sendMail({ to: env.RETURN_NOTIFY_EMAIL, subject, text, html }) } catch {}
  }

  res.status(201).json({ ok: true })
})
