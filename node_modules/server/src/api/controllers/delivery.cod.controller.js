import ApiError from '../../utils/ApiError.js'
import catchAsync from '../../utils/catchAsync.js'
import Order from '../models/Order.js'
import { PAYMENT_STATES, updateOrderStates, applyStateChanges } from '../../utils/stateManager.js'

// GET /api/delivery/cod?status=...
export const listCodOrders = catchAsync(async (req, res) => {
  const { status } = req.query || {}
  const where = { 'payment.method': 'COD' }
  if (status) {
    const v = String(status).toLowerCase()
    if (v === 'handed_over' || v === 'dispatched' || v === 'shipped') where.orderState = 'SHIPPED'
    else if (v === 'out_for_delivery') where.deliveryState = 'OUT_FOR_DELIVERY'
    else if (v === 'completed' || v === 'delivered' || v === 'delivery_confirm') where.deliveryState = 'DELIVERED'
  }

  const items = await Order.find(where).sort({ createdAt: -1 }).limit(100).lean()
  // Return a minimal shape for delivery UIs
  const rows = items.map(o => ({
    id: o._id,
    status: o.status,
    payment: { method: o.payment?.method, status: o.payment?.status },
    paymentStatus: o.payment?.status,
    address: { city: o.address?.city, line1: o.address?.line1, phone: o.address?.phone },
    items: o.items?.map(i => ({ slug: i.slug, name: i.name, qty: i.quantity })) || []
  }))
  res.json({ ok: true, items: rows })
})

// PATCH /api/delivery/cod/:id/payment { action: 'paid'|'failed' }
export const updateCodPayment = catchAsync(async (req, res) => {
  const { id } = req.params
  const { action } = req.body || {}
  const o = await Order.findById(id)
  if (!o) throw new ApiError(404, 'Order not found')
  if (o.payment?.method !== 'COD') throw new ApiError(400, 'Not a COD order')

  // Delivery can record COD payment only after handover and while payment is UNPAID
  const ok = String(o.deliveryState) !== 'NOT_DISPATCHED' || ['SHIPPED','OUT_FOR_DELIVERY','DELIVERED'].includes(String(o.orderState))
  if (!ok) {
    throw new ApiError(403, 'Order not yet in delivery flow')
  }
  if (o.payment?.status !== PAYMENT_STATES.UNPAID) {
    throw new ApiError(400, 'COD payment is not UNPAID')
  }

  let newPaymentStatus
  if (action === 'paid') {
    newPaymentStatus = PAYMENT_STATES.PAID
  } else if (action === 'failed') {
    newPaymentStatus = PAYMENT_STATES.FAILED
  } else {
    throw new ApiError(400, 'Invalid action')
  }
  
  // Use state manager for consistent payment status update
  const changes = updateOrderStates(o, { paymentStatus: newPaymentStatus })
  applyStateChanges(o, changes)
  await o.save()
  res.json({ ok: true, orderId: o._id, payment: o.payment })
})

// PATCH /api/delivery/cod/:id/status { status }
export const updateCodStatus = catchAsync(async (req, res) => {
  const { id } = req.params
  const { status } = req.body || {}

  // Map legacy/lowercase statuses from older COD UI
  const map = (s) => {
    const v = String(s || '').toLowerCase()
    switch (v) {
      case 'out_for_delivery':
        return 'OUT_FOR_DELIVERY'
      case 'delivery_confirm':
      case 'completed':
      case 'delivered':
        return 'DELIVERED'
      default:
        return String(s || '').toUpperCase()
    }
  }
  const target = map(status)
  const ALLOWED = new Set(['OUT_FOR_DELIVERY','DELIVERED'])
  if (!ALLOWED.has(String(target))) throw new ApiError(400, 'Invalid status')

  const o = await Order.findById(id)
  if (!o) throw new ApiError(404, 'Order not found')
  if (o.payment?.method !== 'COD') throw new ApiError(400, 'Not a COD order')

  // Use state manager for consistent delivery state update
  const changes = updateOrderStates(o, { deliveryState: target })
  applyStateChanges(o, changes)
  await o.save()
  res.json({ ok: true, orderId: o._id, deliveryState: o.deliveryState })
})
