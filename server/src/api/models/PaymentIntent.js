import mongoose from 'mongoose'

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  slug: { type: String, required: true, index: true },
  name: { type: String, required: true },
  image: { type: String },
  color: { type: String },
  price: { type: Number, required: true },
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

const paymentIntentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  method: { type: String, enum: ['CARD'], required: true, default: 'CARD' },
  gateway: { type: String, enum: ['PAYHERE'], default: 'PAYHERE' },
  status: { type: String, enum: ['PENDING','PAID','FAILED','CANCELLED'], default: 'PENDING', index: true },

  items: { type: [orderItemSchema], validate: v => Array.isArray(v) && v.length > 0 },
  address: addressSnapshotSchema,
  totals: {
    subtotal: { type: Number, required: true, min: 0 },
    shipping: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true, min: 0 }
  },

  // Linking on completion
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  consumedAt: { type: Date }
}, { timestamps: true })

paymentIntentSchema.index({ createdAt: -1 })

export default mongoose.model('PaymentIntent', paymentIntentSchema)
