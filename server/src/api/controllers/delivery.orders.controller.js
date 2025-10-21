import catchAsync from '../../utils/catchAsync.js'
import ApiError from '../../utils/ApiError.js'
import Order from '../models/Order.js'
import DeliveryEvent from '../models/DeliveryEvent.js'
import { updateOrderStates, applyStateChanges, DELIVERY_STATES, ORDER_STATES, canTransitionDeliveryState, canTransitionOrderState } from '../../utils/stateManager.js'

// List orders for delivery staff across COD, CARD, BANK
export const listDeliveryOrders = catchAsync(async (req, res) => {
  const { status, method } = req.query || {}
  const where = {}
  // Limit to assigned orders for the logged-in delivery user (if any)
  if (req.delivery?.sub) where.assignedDelivery = req.delivery.sub

  // Map incoming filters (supports lowercase UI strings)
  const mapFilter = (s) => {
    const v = String(s || '').toLowerCase()
    switch (v) {
      case 'dispatched':
      case 'handed_over':
      case 'shipped':
        return { orderState: 'SHIPPED' }
      case 'out_for_delivery':
        return { deliveryState: 'OUT_FOR_DELIVERY' }
      case 'delivered':
        return { deliveryState: 'DELIVERED' }
      case 'failed':
      case 'attempted':
      case 'exception':
        return { deliveryState: 'DELIVERY_FAILED' }
      case 'return_to_sender':
        return { deliveryState: 'RTO_INITIATED' }
      case 'returned':
        return { deliveryState: 'RETURNED_TO_WAREHOUSE' }
      case '':
        return null
      default:
        if (/^[A-Z_]+$/.test(String(s))) return { deliveryState: String(s) }
        return null
    }
  }

  const mapped = mapFilter(status)
  if (mapped) Object.assign(where, mapped)
  else {
    // Default: orders in scope for delivery staff
    where.$or = [
      { orderState: 'SHIPPED' },
      { deliveryState: { $in: ['OUT_FOR_DELIVERY','DELIVERED'] } }
    ]
  }

  if (method) where['payment.method'] = method
  else where['payment.method'] = { $in: ['COD','CARD','BANK'] }

  const items = await Order.find(where)
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('assignedDelivery','firstName lastName phone username')
    .populate('user','firstName lastName')
    .lean()
  const rows = items.map(o => ({
    id: o._id,
    orderState: o.orderState,
    deliveryState: o.deliveryState,
    payment: { method: o.payment?.method, status: o.payment?.status },
    paymentStatus: o.payment?.status,
    address: { city: o.address?.city, line1: o.address?.line1, phone: o.address?.phone },
    customer: { name: `${o.user?.firstName || ''} ${o.user?.lastName || ''}`.trim() || undefined },
    total: o.totals?.grandTotal,
    items: (o.items || []).map(i => ({ slug: i.slug, name: i.name, qty: i.quantity, image: i.image }))
  }))
  res.json({ ok: true, items: rows })
})

// Update order status (shared for all methods) — limited set allowed for delivery
export const updateDeliveryOrderStatus = catchAsync(async (req, res) => {
  const { id } = req.params
  const { status } = req.body || {}

  // Map incoming UI status (lowercase/aliases) to canonical delivery state
  const mapIncoming = (s) => {
    const v = String(s || '').toLowerCase()
    switch (v) {
      case 'out_for_delivery':
        return DELIVERY_STATES.OUT_FOR_DELIVERY
      case 'delivered':
        return DELIVERY_STATES.DELIVERED
      case 'failed':
      case 'attempted':
      case 'exception':
        return DELIVERY_STATES.DELIVERY_FAILED
      case 'return_to_sender':
        return DELIVERY_STATES.RTO_INITIATED
      case 'returned':
        return DELIVERY_STATES.RETURNED_TO_WAREHOUSE
      default:
        return String(s || '').toUpperCase()
    }
  }

  const target = mapIncoming(status)
  const ALLOWED = new Set([
    DELIVERY_STATES.OUT_FOR_DELIVERY,
    DELIVERY_STATES.DELIVERED,
    DELIVERY_STATES.DELIVERY_FAILED,
    DELIVERY_STATES.RTO_INITIATED,
    DELIVERY_STATES.RETURNED_TO_WAREHOUSE,
  ])
  if (!ALLOWED.has(target)) throw new ApiError(400, 'Invalid status')

  const o = await Order.findById(id)
  if (!o) throw new ApiError(404, 'Order not found')

  const handed = String(o.deliveryState) !== 'NOT_DISPATCHED' || ['SHIPPED','OUT_FOR_DELIVERY'].includes(String(o.orderState))
  if (!handed) {
    throw new ApiError(403, 'Order not yet handed over to delivery')
  }

  if ([DELIVERY_STATES.DELIVERY_FAILED, DELIVERY_STATES.RTO_INITIATED].includes(target)) {
    const r = req.body?.reason || {}
    if (r.code || r.detail) {
      o.deliveryMeta = o.deliveryMeta || {}
      o.deliveryMeta.reasons = o.deliveryMeta.reasons || {}
      o.deliveryMeta.reasons[String(target)] = { code: r.code, detail: r.detail }
    }
  }

  if (target === DELIVERY_STATES.DELIVERED) {
    const ev = req.body?.evidence || {}
    if (ev.podPhotoUrl || ev.signatureUrl || ev.otp) {
      o.deliveryMeta = o.deliveryMeta || {}
      o.deliveryMeta.evidence = o.deliveryMeta.evidence || {}
      o.deliveryMeta.evidence.delivered = { at: new Date(), podPhotoUrl: ev.podPhotoUrl, signatureUrl: ev.signatureUrl, otp: ev.otp }
    }
  }

  const sequence = []
  if (target === DELIVERY_STATES.DELIVERED) {
    if (!canTransitionDeliveryState(o.deliveryState, DELIVERY_STATES.DELIVERED)) {
      if (canTransitionDeliveryState(o.deliveryState, DELIVERY_STATES.OUT_FOR_DELIVERY)) {
        sequence.push(DELIVERY_STATES.OUT_FOR_DELIVERY)
      }
    }
    sequence.push(DELIVERY_STATES.DELIVERED)
  } else if (target === DELIVERY_STATES.RETURNED_TO_WAREHOUSE) {
    if (!canTransitionDeliveryState(o.deliveryState, DELIVERY_STATES.RETURNED_TO_WAREHOUSE)) {
      if (canTransitionDeliveryState(o.deliveryState, DELIVERY_STATES.RTO_INITIATED)) {
        sequence.push(DELIVERY_STATES.RTO_INITIATED)
      }
    }
    sequence.push(DELIVERY_STATES.RETURNED_TO_WAREHOUSE)
  } else {
    sequence.push(target)
  }

  const events = []
  let prev = o.deliveryState
  for (const st of sequence) {
    const changes = updateOrderStates(o, { deliveryState: st })
    applyStateChanges(o, changes)

    // Keep orderState in sync for key delivery milestones
    if (st === DELIVERY_STATES.OUT_FOR_DELIVERY) {
      if (canTransitionOrderState(o.orderState, ORDER_STATES.OUT_FOR_DELIVERY)) {
        const ordCh = updateOrderStates(o, { orderState: ORDER_STATES.OUT_FOR_DELIVERY })
        applyStateChanges(o, ordCh)
      }
    }
    if (st === DELIVERY_STATES.DELIVERED) {
      if (canTransitionOrderState(o.orderState, ORDER_STATES.DELIVERED)) {
        const ordCh = updateOrderStates(o, { orderState: ORDER_STATES.DELIVERED })
        applyStateChanges(o, ordCh)
      }
    }
    // queue audit log for this transition
    const ev = req.body?.evidence || {}
    const r = req.body?.reason || {}
    const payload = {
      order: o._id,
      fromState: String(prev || ''),
      toState: String(st),
      actor: 'delivery',
      reason: (r.code || r.detail) ? { code: r.code, detail: r.detail } : undefined,
      evidence: (st === DELIVERY_STATES.DELIVERED || ev.podPhotoUrl || ev.signatureUrl || ev.otp || ev.scanRef || ev.photoUrl) ? {
        scanRef: ev.scanRef,
        photoUrl: ev.photoUrl,
        podPhotoUrl: ev.podPhotoUrl,
        signatureUrl: ev.signatureUrl,
        otp: ev.otp
      } : undefined
    }
    // attach actor id if available
    if (req.delivery?.sub) {
      payload.actorId = req.delivery.sub
      payload.actorModel = 'Delivery'
    }
    events.push(payload)
    prev = st
  }

  await o.save()
  // write audit logs (non-blocking)
  try { if (events.length) await DeliveryEvent.insertMany(events) } catch {}
  res.json({ ok: true, orderId: o._id, deliveryState: o.deliveryState })
})