import ApiError from '../../utils/ApiError.js'
import catchAsync from '../../utils/catchAsync.js'
import Order from '../models/Order.js'
import { PAYMENT_STATES, updateOrderStates, applyStateChanges } from '../../utils/stateManager.js'
import PaymentTransaction from '../models/PaymentTransaction.js'

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
  
  // Map action to payment status
  const target = String(action) === 'failed' ? PAYMENT_STATES.FAILED : PAYMENT_STATES.PAID
  if (o.payment?.status === target) {
    return res.json({ ok: true, orderId: o._id, paymentStatus: o.payment?.status })
  }
  
  // Compute and apply state changes consistently
  const changes = updateOrderStates(o, { paymentStatus: target })
  applyStateChanges(o, changes)
  await o.save()

  // Log COD collection/failed
  await PaymentTransaction.create({
    order: o._id,
    method: 'COD',
    action: target === PAYMENT_STATES.PAID ? 'COD_COLLECTED' : 'COD_FAILED',
    status: target,
    amount: o.totals?.grandTotal,
    currency: 'LKR',
    notes: target === PAYMENT_STATES.PAID ? 'COD collected by delivery' : 'COD collection failed',
    createdBy: 'delivery'
  })
  res.json({ ok: true, orderId: o._id, paymentStatus: o.payment?.status })
})

// PATCH /api/delivery/cod/:id/status { status }
export const updateCodStatus = catchAsync(async (req, res) => {
  const { id } = req.params
  const { status } = req.body || {}
  // View-only mode: Delivery Panel is not allowed to mutate delivery status
  throw new ApiError(403, 'Delivery panel is view-only. Status changes are disabled.')
})
