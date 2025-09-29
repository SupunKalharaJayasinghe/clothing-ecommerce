import mongoose from 'mongoose'

const returnItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  slug: { type: String, required: true },
  name: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 },
  reason: { type: String, required: true, trim: true },
  condition: { 
    type: String, 
    enum: ['NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'DAMAGED'], 
    default: 'GOOD' 
  }
}, { _id: false })

const returnSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  
  // Return items (subset of order items)
  items: { type: [returnItemSchema], required: true, validate: v => Array.isArray(v) && v.length > 0 },
  
  status: {
    type: String,
    enum: [
      'REQUESTED',    // Customer requested return
      'APPROVED',     // Admin approved return request
      'REJECTED',     // Admin rejected return request
      'SHIPPED',      // Customer has shipped items back
      'RECEIVED',     // Items received by warehouse
      'INSPECTED',    // Items have been inspected
      'COMPLETED',    // Return process completed (refund issued)
      'CANCELLED'     // Return cancelled
    ],
    default: 'REQUESTED',
    index: true
  },
  
  // Return details
  reason: { type: String, required: true, trim: true },
  customerNotes: { type: String, trim: true },
  photos: { type: [String], default: [] },
  
  // Financial details
  // Financial details
  refundAmount: { type: Number, min: 0 },
  restockingFee: { type: Number, min: 0, default: 0 },
  shippingFee: { type: Number, min: 0, default: 0 },
  
  // Shipping details for return
  returnShipping: {
    trackingNumber: { type: String, trim: true },
    carrier: { type: String, trim: true },
    shippedAt: { type: Date },
    receivedAt: { type: Date },
    returnAddress: {
      line1: { type: String, trim: true },
      line2: { type: String, trim: true },
      city: { type: String, trim: true },
      region: { type: String, trim: true },
      postalCode: { type: String, trim: true },
      country: { type: String, trim: true }
    }
  },
  
  // Inspection results
  inspection: {
    inspectedAt: { type: Date },
    inspectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    notes: { type: String, trim: true },
    itemsCondition: [{
      product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      condition: { 
        type: String, 
        enum: ['NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'DAMAGED'] 
      },
      quantity: { type: Number, min: 0 },
      notes: { type: String, trim: true }
    }]
  },
  
  // Status timestamps
  requestedAt: { type: Date },
  approvedAt: { type: Date },
  rejectedAt: { type: Date },
  shippedAt: { type: Date },
  receivedAt: { type: Date },
  inspectedAt: { type: Date },
  completedAt: { type: Date },
  cancelledAt: { type: Date },
  
  // User tracking
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  
  // Related refund
  refund: { type: mongoose.Schema.Types.ObjectId, ref: 'Refund' }
}, { timestamps: true })

// Indexes for efficient queries
returnSchema.index({ status: 1, createdAt: -1 })
returnSchema.index({ user: 1, createdAt: -1 })
returnSchema.index({ requestedAt: -1 })
returnSchema.index({ completedAt: -1 })

// Virtual for checking if return is pending
returnSchema.virtual('isPending').get(function() {
  return ['REQUESTED', 'APPROVED', 'SHIPPED', 'RECEIVED', 'INSPECTED'].includes(this.status)
})

// Virtual for checking if return is completed
returnSchema.virtual('isCompleted').get(function() {
  return ['COMPLETED', 'REJECTED', 'CANCELLED'].includes(this.status)
})

// Virtual for total refund amount calculation
returnSchema.virtual('totalRefundAmount').get(function() {
  let total = this.refundAmount || 0
  total -= this.restockingFee || 0
  total -= this.shippingFee || 0
  return Math.max(0, total)
})

// Make virtuals appear in JSON
returnSchema.set('toJSON', { virtuals: true })
returnSchema.set('toObject', { virtuals: true })

export default mongoose.model('Return', returnSchema)