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
  status: { type: String, enum: ['UNPAID','PENDING','AUTHORIZED','PAID','FAILED','REFUND_PENDING','REFUNDED'], default: 'UNPAID' },

  // Card (PayHere) fields
  gateway: { type: String, enum: ['PAYHERE'], default: undefined },
  gatewayRef: { type: String },        // e.g., PayHere order_id / payment_id
  md5sig: { type: String },

  // Bank transfer fields
  bank: {
    slipUrl: { type: String },
    uploadedAt: { type: Date },
    verifiedAt: { type: Date },
    verifyBy: { type: Date } // deadline for verification (e.g., 72h after upload)
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
  deliveryMeta: {
    evidence: {
      dispatched: { at: Date, scanRef: String, photoUrl: String },
      delivered: { at: Date, podPhotoUrl: String, signatureUrl: String, otp: String }
    },
    reasons: {
      attempted: { code: String, detail: String },
      failed: { code: String, detail: String },
      exception: { code: String, detail: String },
      return_to_sender: { code: String, detail: String }
    }
  },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  items: { type: [orderItemSchema], validate: v => Array.isArray(v) && v.length > 0 },
  address: addressSnapshotSchema,

  totals: {
    subtotal: { type: Number, required: true, min: 0 },
    shipping: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true, min: 0 }
  },

// New explicit state fields
  orderState: {
    type: String,
    enum: ['CREATED','CONFIRMED','PACKING','SHIPPED','OUT_FOR_DELIVERY','DELIVERED','CANCELLED','RETURN_REQUESTED','RETURNED'],
    default: 'CREATED',
    index: true
  },
  deliveryState: {
    type: String,
    enum: [
      'NOT_DISPATCHED','SHIPPED','IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERED','DELIVERY_FAILED','RTO_INITIATED','RETURNED_TO_WAREHOUSE'
    ],
    default: 'NOT_DISPATCHED',
    index: true
  },

// Legacy combined status (kept for backward compatibility)
  status: {
    type: String,
    enum: [
      // New primary states
      'CREATED','CONFIRMED','PACKING','SHIPPED','OUT_FOR_DELIVERY','DELIVERED','CANCELLED','RETURN_REQUESTED','RETURNED',
      // Delivery summary states
      'NOT_DISPATCHED','IN_TRANSIT','DELIVERY_FAILED','RTO_INITIATED','RETURNED_TO_WAREHOUSE',
      // Older legacy strings still supported for consumers (kept)
      'pending_payment','placed','packing','handed_over','out_for_delivery','payment_confirm','delivery_confirm','delivery_confirm_bank','completed',
      'confirmed','packed','ready_for_pickup','dispatched','in_transit','at_local_facility','delivered','held_for_pickup','attempted','failed','return_to_sender','returned','exception','cancelled'
    ],
    default: 'CREATED',
    index: true
  },
  statusHistory: [{
    status: { type: String, required: true },
    at: { type: Date, default: Date.now }
  }],

  // Assigned delivery person (optional)
  assignedDelivery: { type: mongoose.Schema.Types.ObjectId, ref: 'Delivery', index: true },
  assignedAt: { type: Date },

  payment: paymentSchema,

  // Optional return workflow tracked separately from order.status
  returnRequest: returnRequestSchema
}, { timestamps: true })

// indexes to help lists
orderSchema.index({ 'returnRequest.status': 1 })

export default mongoose.model('Order', orderSchema)
