import ApiError from '../../utils/ApiError.js'
import catchAsync from '../../utils/catchAsync.js'
import Order from '../models/Order.js'
import User from '../models/User.js'
import Product from '../models/Product.js'
import Delivery from '../models/Delivery.js'
import PaymentTransaction from '../models/PaymentTransaction.js'
import mongoose from 'mongoose'
import { getInitialStates, updateOrderStates, applyStateChanges, DELIVERY_STATES, ORDER_STATES, validateDispatchRequirements } from '../../utils/stateManager.js'

const ALLOWED_STATUSES = [
  // Admin-friendly aliases
  'placed','packed','dispatched',
  // Order states
  'CREATED','CONFIRMED','PACKING','SHIPPED','OUT_FOR_DELIVERY','DELIVERED','CANCELLED','RETURN_REQUESTED','RETURNED',
  // Delivery states
  'NOT_DISPATCHED','SHIPPED','IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERED','DELIVERY_FAILED','RTO_INITIATED','RETURNED_TO_WAREHOUSE'
]

function toObjectIdMaybe(id) {
  // naive check for 24-hex string
  return /^[a-fA-F0-9]{24}$/.test(String(id)) ? id : null
}

export const listOrders = catchAsync(async (req, res) => {
  const { q = '', status, page = 1, limit = 20 } = req.query

  const filters = []
  if (status && ALLOWED_STATUSES.includes(String(status))) {
    const s = String(status)
    const orderStates = new Set(['placed','confirmed','cancelled','closed'])
    const deliveryStates = new Set(['confirmed','packed','ready_for_pickup','dispatched','in_transit','at_local_facility','out_for_delivery','delivered','held_for_pickup','attempted','failed','return_to_sender','returned','exception'])
    if (orderStates.has(s)) filters.push({ orderState: s })
    else if (deliveryStates.has(s)) filters.push({ deliveryState: s })
    else filters.push({ status: s })
  }

  if (q && String(q).trim()) {
    const ql = String(q).trim()
    const rx = new RegExp(ql.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')

    const userIds = await User.find({ $or: [{ email: rx }, { username: rx }] }).select('_id').lean()
    const idList = userIds.map(u => u._id)

    const or = [
      { 'items.slug': rx },
      { 'items.name': rx }
    ]
    const oid = toObjectIdMaybe(ql)
    if (oid) or.push({ _id: oid })
    if (idList.length) or.push({ user: { $in: idList } })

    filters.push({ $or: or })
  }

  const where = filters.length ? { $and: filters } : {}
  const pageNum = Math.max(parseInt(page, 10) || 1, 1)
  const perPage = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100)
  const skip = (pageNum - 1) * perPage

  const [items, total] = await Promise.all([
    Order.find(where)
      .populate('assignedDelivery', 'firstName lastName phone email username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(perPage)
      .lean(),
    Order.countDocuments(where)
  ])

  res.json({ ok: true, items, page: pageNum, limit: perPage, total, hasMore: skip + items.length < total })
})

export const getOrder = catchAsync(async (req, res) => {
  const { id } = req.params
  const o = await Order.findById(id)
    .populate('assignedDelivery', 'firstName lastName phone email username')
    .lean()
  if (!o) throw new ApiError(404, 'Order not found')
  res.json({ ok: true, order: o })
})

export const getOrderDetails = catchAsync(async (req, res) => {
  const { id } = req.params
  const o = await Order.findById(id)
    .populate('assignedDelivery', 'firstName lastName phone email username')
    .populate('user', 'firstName lastName email username')
    .lean()
  if (!o) throw new ApiError(404, 'Order not found')
  
  // Include additional details for detailed report
  const orderDetails = {
    ...o,
    totalValue: o.totals?.grandTotal || 0,
    subtotal: o.totals?.subtotal || 0,
    shipping: o.totals?.shipping || 0,
    tax: o.totals?.tax || 0,
    discount: o.totals?.discount || 0,
    itemCount: o.items?.length || 0,
    customerName: o.user ? `${o.user.firstName || ''} ${o.user.lastName || ''}`.trim() : 'Guest',
    customerEmail: o.user?.email || 'N/A',
    paymentStatus: o.payment?.status || 'N/A',
    paymentMethod: o.payment?.method || 'N/A'
  }
  
  res.json({ ok: true, order: orderDetails })
})

export const updateStatus = catchAsync(async (req, res) => {
  const { id } = req.params
  const { status } = req.body || {}
  const raw = String(status)
  if (!ALLOWED_STATUSES.includes(raw)) {
    throw new ApiError(400, 'Invalid status')
  }
  const o = await Order.findById(id)
  if (!o) throw new ApiError(404, 'Order not found')
  
  // Normalize legacy states on the current order so transitions validate
  const ordNow = String(o.orderState || '').toUpperCase()
  const delNow = String(o.deliveryState || '').toUpperCase()
  const payNow = String(o.payment?.status || '').toUpperCase()
  const normOrder = ({
    'PLACED':'CONFIRMED',
    'CONFIRMED':'CONFIRMED',
    'PACKING':'PACKING',
    'PACKED':'PACKING',
    'HANDED_OVER':'SHIPPED',
    'SHIPPED':'SHIPPED',
    'OUT_FOR_DELIVERY':'OUT_FOR_DELIVERY',
    'DELIVERED':'DELIVERED',
    'CANCELLED':'CANCELLED',
    'CLOSED':'DELIVERED'
  })
  const normDelivery = ({
    'NOT_STARTED':'NOT_DISPATCHED',
    'NOT_DISPATCHED':'NOT_DISPATCHED',
    'CONFIRMED':'NOT_DISPATCHED',
    'PACKED':'NOT_DISPATCHED',
    'READY_FOR_PICKUP':'NOT_DISPATCHED',
    'DISPATCHED':'SHIPPED',
    'IN_TRANSIT':'IN_TRANSIT',
    'AT_LOCAL_FACILITY':'IN_TRANSIT',
    'OUT_FOR_DELIVERY':'OUT_FOR_DELIVERY',
    'DELIVERED':'DELIVERED',
    'FAILED':'DELIVERY_FAILED',
    'ATTEMPTED':'DELIVERY_FAILED',
    'RETURN_TO_SENDER':'RTO_INITIATED',
    'RETURNED':'RETURNED_TO_WAREHOUSE',
    'EXCEPTION':'DELIVERY_FAILED',
    'CANCELLED':'RETURNED_TO_WAREHOUSE'
  })
  const normPayment = ({
    'PAID':'PAID',
    'PENDING':'PENDING',
    'AUTHORIZED':'AUTHORIZED',
    'FAILED':'FAILED',
    'REFUNDED':'REFUNDED',
    'REFUND_PENDING':'REFUND_PENDING',
    'UNPAID':'UNPAID',
    'COD_PENDING':'UNPAID',
    'COD_COLLECTED':'PAID',
    'PENDING_VERIFICATION':'PENDING',
    'INITIATED':'PENDING'
  })
  // Apply normalized uppercase state values if actual doc differs
  const normOrdVal = normOrder[ordNow] || ordNow
  if (normOrdVal && String(o.orderState || '') !== normOrdVal) o.orderState = normOrdVal

  const normDelVal = normDelivery[delNow] || delNow
  if (normDelVal && String(o.deliveryState || '') !== normDelVal) o.deliveryState = normDelVal

  if (o.payment) {
    const normPayVal = normPayment[payNow] || payNow
    if (normPayVal && String(o.payment.status || '') !== normPayVal) o.payment.status = normPayVal
  }
  
  // Map admin-friendly aliases to canonical states for the requested change
  const aliasMap = new Map([
    ['placed', ORDER_STATES.CONFIRMED],
    ['packed', ORDER_STATES.PACKING],
    ['dispatched', DELIVERY_STATES.SHIPPED],
  ])
  const s = aliasMap.get(raw) || raw
  const orderStates = new Set(['CREATED','CONFIRMED','PACKING','SHIPPED','OUT_FOR_DELIVERY','DELIVERED','CANCELLED','RETURN_REQUESTED','RETURNED'])
  const deliveryStates = new Set(['NOT_DISPATCHED','SHIPPED','IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERED','DELIVERY_FAILED','RTO_INITIATED','RETURNED_TO_WAREHOUSE'])

  // Admin three-phase overrides (placed/packed/dispatched)
  if (raw === 'placed' || raw === 'packed' || raw === 'dispatched') {
    // When setting to dispatched, allow evidence missing only if already present
    if (raw === 'dispatched') {
      if (!validateDispatchRequirements(o)) {
        const method = o.payment?.method
        const pay = o.payment?.status
        let requiredStatus
        if (method === 'COD') requiredStatus = 'UNPAID or PAID'
        else if (method === 'CARD') requiredStatus = 'PAID or AUTHORIZED'
        else if (method === 'BANK') requiredStatus = 'PAID'
        throw new ApiError(400, `Cannot dispatch ${method} order. Requires payment status: ${requiredStatus}. Current: ${pay}`)
      }
      const ev = req.body?.evidence || {}
      const assignId = req.body?.assignDeliveryId
      const had = !!o?.deliveryMeta?.evidence?.dispatched
      if (!had && !ev.scanRef && !ev.photoUrl && !assignId) {
        throw new ApiError(400, 'DISPATCHED requires scanRef/photoUrl OR selecting a delivery person')
      }
      // Attach/overwrite evidence when supplied
      if (ev.scanRef || ev.photoUrl) {
        o.deliveryMeta = o.deliveryMeta || {}
        o.deliveryMeta.evidence = o.deliveryMeta.evidence || {}
        o.deliveryMeta.evidence.dispatched = { at: new Date(), scanRef: ev.scanRef, photoUrl: ev.photoUrl }
      }
      // Optional assignment of delivery person
      if (assignId) {
        const exists = await Delivery.findById(assignId).select('_id')
        if (!exists) throw new ApiError(400, 'Delivery user not found')
        o.assignedDelivery = assignId
        o.assignedAt = o.assignedAt || new Date()
      }
    }
    // Construct changes for this phase
    const { getAdminPhaseChanges } = await import('../../utils/stateManager.js')
    const ch = getAdminPhaseChanges(o, raw)
    // Apply without transition gating (admin override limited to these three)
    applyStateChanges(o, ch)
    await o.save()
    return res.json({ ok: true, order: o })
  }

  // Reasons required
  const needReason = new Set(['attempted','failed','exception','return_to_sender'])
  if (needReason.has(s)) {
    const r = req.body?.reason || {}
    if (!r.code && !r.detail) {
      throw new ApiError(400, `${s.toUpperCase()} requires reason code or detail`)
    }
    o.deliveryMeta = o.deliveryMeta || {}
    o.deliveryMeta.reasons = o.deliveryMeta.reasons || {}
    o.deliveryMeta.reasons[s.replace(/-/g,'_')] = { code: r.code, detail: r.detail }
  }

  // POD evidence required for delivered
  if (s === 'delivered') {
    const ev = req.body?.evidence || {}
    if (!ev.podPhotoUrl && !ev.signatureUrl && !ev.otp) {
      throw new ApiError(400, 'DELIVERED requires POD evidence (photo/signature/otp)')
    }
    o.deliveryMeta = o.deliveryMeta || {}
    o.deliveryMeta.evidence = o.deliveryMeta.evidence || {}
    o.deliveryMeta.evidence.delivered = { at: new Date(), podPhotoUrl: ev.podPhotoUrl, signatureUrl: ev.signatureUrl, otp: ev.otp }
  }

  // Apply state using state manager
  const updates = {}
  if (orderStates.has(s)) updates.orderState = s
  if (deliveryStates.has(s)) updates.deliveryState = s
  
  const changes = updateOrderStates(o, updates)
  applyStateChanges(o, changes)

  await o.save()
  res.json({ ok: true, order: o })
})

// POST /api/admin/orders
// Create a new order on behalf of a user
export const createOrder = catchAsync(async (req, res) => {
  const { userId, method, items, address, addressId } = req.body || {}
  if (!userId) throw new ApiError(400, 'userId is required')
  if (!['COD','CARD','BANK'].includes(String(method))) throw new ApiError(400, 'Invalid payment method')
  if (!Array.isArray(items) || items.length === 0) throw new ApiError(400, 'At least one item is required')

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

  const subtotal = orderItems.reduce((s, it) => s + it.price * it.quantity, 0)
  const totals = { subtotal, shipping: 0, discount: 0, grandTotal: subtotal }

  // Resolve address: prefer explicit; else saved by id; else user's default
  let addr = address
  if (!addr) {
    const user = await User.findById(userId)
    if (!user) throw new ApiError(404, 'User not found')
    if (addressId) {
      const found = user.addresses?.id(addressId)
      if (!found) throw new ApiError(400, 'Saved address not found')
      addr = found.toObject()
    } else {
      const def = user.addresses?.find(a => a.isDefault) || user.addresses?.[0]
      if (!def) throw new ApiError(400, 'No address provided and no saved address found')
      addr = def.toObject()
    }
  }

  const { orderState, deliveryState, paymentStatus, legacyStatus } = getInitialStates(method)
  const payment = { method, status: paymentStatus }
  if (method === 'CARD') payment.gateway = 'PAYHERE'

  let order
  if (method === 'CARD') {
    // Pre-order, stock not decremented yet
    order = await Order.create({
      user: userId,
      items: orderItems,
      address: addr,
      totals,
      status: legacyStatus,
      orderState,
      deliveryState,
      statusHistory: [{ status: legacyStatus }],
      payment
    })
  } else {
    // Reserve stock atomically for COD/BANK
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
        user: userId,
        items: orderItems,
        address: addr,
        totals,
        status: legacyStatus,
        orderState,
        deliveryState,
        statusHistory: [{ status: legacyStatus }],
        payment
      }], { session })
      order = created[0]
    })
    session.endSession()
  }

  // Log payment transaction for created order (non-blocking)
  try {
    await PaymentTransaction.create({
      order: order._id,
      method,
      action: 'CREATED',
      status: payment.status,
      amount: totals.grandTotal,
      currency: 'LKR',
      createdBy: 'admin'
    })
  } catch (err) {
    // Do not block order creation on audit log failure
  }

  res.status(201).json({ ok: true, orderId: order._id })
})

// DELETE /api/admin/orders/:id
// Soft-safe delete: only allow deletion before dispatch; restock inventory if previously reserved
export const deleteOrder = catchAsync(async (req, res) => {
  const { id } = req.params
  const o = await Order.findById(id)
  if (!o) throw new ApiError(404, 'Order not found')

  const blocked = new Set(['dispatched','in_transit','at_local_facility','out_for_delivery','delivered','returned'])
  if (blocked.has(String(o.deliveryState))) {
    throw new ApiError(400, 'Cannot delete an order already handed over to delivery')
  }

  // Restock inventory when it was reserved
  const needRestock = (o.payment?.method === 'CARD') ? (o.payment?.status === 'paid') : (o.payment?.method === 'COD' || o.payment?.method === 'BANK')
  if (needRestock) {
    const ops = (o.items || []).map(it => ({
      updateOne: {
        filter: { _id: it.product },
        update: { $inc: { stock: it.quantity } }
      }
    }))
    await Product.bulkWrite(ops)
  }

  await Order.deleteOne({ _id: id })
  res.json({ ok: true, deleted: true })
})
