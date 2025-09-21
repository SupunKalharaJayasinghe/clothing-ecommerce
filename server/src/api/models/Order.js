import mongoose from 'mongoose'

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  slug: { type: String, required: true, index: true },
  name: { type: String, required: true },
  image: { type: String },
  color: { type: String },
  price: { type: Number, required: true },      // unit price at time of order (finalPrice)
  quantity: { type: Number, required: true, min: 1 }
}, { _id: false })

const addressSnapshotSchema = new mongoose.Schema({
  label: { type: String, trim: true },
  line1: { type: String, required: true, trim: true },
  line2: { type: String, trim: true },
  city: { type: String, required: true, trim: true },
  region: { type: String, trim: true },
  postalCode: { type: String, trim: true },
  country: { type: String, required: true, trim: true },
  phone: { type: String, trim: true }
}, { _id: false })

const paymentSchema = new mongoose.Schema({
  method: { type: String, enum: ['COD','CARD','BANK'], required: true },
  status: { type: String, enum: ['pending','initiated','paid','failed','refunded'], default: 'pending' },

  // Card (PayHere) fields
  gateway: { type: String, enum: ['PAYHERE'], default: undefined },
  gatewayRef: { type: String },        // e.g., PayHere order_id / payment_id
  md5sig: { type: String },

  // Bank transfer fields
  bank: {
    slipUrl: { type: String },
    uploadedAt: { type: Date },
    verifiedAt: { type: Date }
  }
}, { _id: false })

const returnRequestSchema = new mongoose.Schema({
  status: { type: String, enum: ['requested','approved','rejected','received','closed'] },
  reason: { type: String, trim: true },
  requestedAt: { type: Date },
  updatedAt: { type: Date },
  closedAt: { type: Date }
}, { _id: false })

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  items: { type: [orderItemSchema], validate: v => Array.isArray(v) && v.length > 0 },
  address: addressSnapshotSchema,

  totals: {
    subtotal: { type: Number, required: true, min: 0 },
    shipping: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true, min: 0 }
  },

  // For Card/Bank we track detailed states; for COD just placed -> completed
  status: {
    type: String,
    enum: [
      // pre-payment (card)
      'pending_payment',
      // common
      'placed',
      // for card flow
      'packing','handed_over','out_for_delivery','payment_confirm','delivery_confirm',
      // for bank flow
      'delivery_confirm_bank',
      // for cod
      'completed'
    ],
    default: 'placed',
    index: true
  },
  statusHistory: [{
    status: { type: String, required: true },
    at: { type: Date, default: Date.now }
  }],

  payment: paymentSchema,

  // Optional return workflow tracked separately from order.status
  returnRequest: returnRequestSchema
}, { timestamps: true })

// indexes to help lists
orderSchema.index({ 'returnRequest.status': 1 })

export default mongoose.model('Order', orderSchema)
