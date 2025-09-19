import Product from '../models/Product.js'
import Order from '../models/Order.js'
import ApiError from '../../utils/ApiError.js'
import catchAsync from '../../utils/catchAsync.js'

function calcTotals(items) {
  const subtotal = items.reduce((s, it) => s + (it.price * it.quantity), 0)
  const shipping = 0
  const discount = 0
  const grandTotal = subtotal + shipping - discount
  return { subtotal, shipping, discount, grandTotal }
}

// POST /api/orders
export const placeOrder = catchAsync(async (req, res) => {
  const { method, address, items } = req.body
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

  // derive initial status & payment
  let status = 'placed'
  let payment = { method, status: 'pending' }

  if (method === 'CARD') {
    payment = { method, status: 'initiated', gateway: 'PAYHERE' }
  }
  // BANK stays 'pending' until verify; COD stays 'pending' until delivery cash confirm

  const order = await Order.create({
    user: req.user.sub,
    items: orderItems,
    address,
    totals,
    status,
    statusHistory: [{ status }],
    payment
  })

  // For CARD: return minimal payload you can use to build a PayHere form client-side (sandbox)
  let payhere = null
  if (method === 'CARD') {
    // NOTE: To really charge, fill these from env and generate md5sig in a dedicated service.
    payhere = {
      sandbox: true,
      action: 'https://sandbox.payhere.lk/pay/checkout',
      params: {
        merchant_id: process.env.PAYHERE_MERCHANT_ID || 'YOUR_MERCHANT_ID',
        return_url: process.env.PAYHERE_RETURN_URL || 'http://localhost:5173/orders',
        cancel_url: process.env.PAYHERE_CANCEL_URL || 'http://localhost:5173/checkout',
        notify_url: process.env.PAYHERE_NOTIFY_URL || 'http://localhost:4000/api/payments/payhere/webhook',
        order_id: String(order._id),
        items: `Order ${order._id}`,
        currency: 'LKR',
        amount: String(order.totals.grandTotal.toFixed(2)),
        first_name: 'Customer',
        last_name: 'User',
        email: 'email@example.com',
        phone: address.phone || '',
        address: `${address.line1} ${address.line2 || ''}`.trim(),
        city: address.city,
        country: address.country
        // md5sig should be added here after hashing (left to your PayHere service)
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
