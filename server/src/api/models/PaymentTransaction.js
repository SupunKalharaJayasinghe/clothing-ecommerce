import mongoose from 'mongoose'

const paymentTransactionSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  method: { type: String, enum: ['COD', 'CARD', 'BANK'], required: true },
  action: { 
    type: String, 
    enum: ['CREATED', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED', 'CANCELLED', 'VERIFIED'], 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['UNPAID', 'PENDING', 'AUTHORIZED', 'PAID', 'FAILED', 'REFUND_PENDING', 'REFUNDED'], 
    required: true 
  },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'LKR' },
  
  // Gateway specific fields
  gateway: { type: String, enum: ['PAYHERE'] },
  gatewayRef: { type: String }, // PayHere payment_id, order_id, etc.
  gatewayResponse: { type: mongoose.Schema.Types.Mixed }, // Full gateway response
  
  // Internal tracking
  notes: { type: String, trim: true },
  createdBy: { type: String, enum: ['user', 'admin', 'system'], default: 'system' },
  processedAt: { type: Date },
  
  // Error tracking
  errorCode: { type: String },
  errorMessage: { type: String }
}, { timestamps: true })

// Indexes for efficient queries
paymentTransactionSchema.index({ order: 1, createdAt: -1 })
paymentTransactionSchema.index({ method: 1, status: 1 })
paymentTransactionSchema.index({ gatewayRef: 1 })

export default mongoose.model('PaymentTransaction', paymentTransactionSchema)