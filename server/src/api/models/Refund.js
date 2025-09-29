import mongoose from 'mongoose'

const refundSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, unique: true, index: true },
  method: { type: String, enum: ['COD', 'CARD', 'BANK'], required: true },
  status: { 
    type: String, 
    enum: ['REQUESTED', 'APPROVED', 'PROCESSING', 'PROCESSED', 'FAILED', 'CANCELLED'], 
    default: 'REQUESTED',
    index: true
  },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'LKR' },
  
  // Refund reason and details
  reason: { type: String, trim: true },
  customerReason: { type: String, trim: true }, // Customer provided reason
  adminNotes: { type: String, trim: true }, // Internal admin notes
  notes: { type: String, trim: true }, // General notes
  
  // Gateway refund details
  gateway: { type: String, enum: ['PAYHERE'] },
  gatewayRefundId: { type: String }, // Gateway's refund transaction ID
  gatewayResponse: { type: mongoose.Schema.Types.Mixed }, // Full gateway response
  
  // Status tracking timestamps
  requestedAt: { type: Date },
  approvedAt: { type: Date },
  processedAt: { type: Date },
  failedAt: { type: Date },
  cancelledAt: { type: Date },
  
  // User tracking
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  
  // Processing details
  refundMethod: { type: String, enum: ['ORIGINAL_PAYMENT', 'BANK_TRANSFER', 'STORE_CREDIT'], default: 'ORIGINAL_PAYMENT' },
  bankDetails: {
    accountName: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    bankName: { type: String, trim: true },
    routingNumber: { type: String, trim: true }
  }
}, { timestamps: true })

// Indexes for efficient queries
refundSchema.index({ status: 1, createdAt: -1 })
refundSchema.index({ method: 1, status: 1 })
refundSchema.index({ requestedAt: -1 })
refundSchema.index({ processedAt: -1 })

// Virtual for checking if refund is pending
refundSchema.virtual('isPending').get(function() {
  return ['REQUESTED', 'APPROVED', 'PROCESSING'].includes(this.status)
})

// Virtual for checking if refund is completed
refundSchema.virtual('isCompleted').get(function() {
  return ['PROCESSED', 'FAILED', 'CANCELLED'].includes(this.status)
})

// Make virtuals appear in JSON
refundSchema.set('toJSON', { virtuals: true })
refundSchema.set('toObject', { virtuals: true })

export default mongoose.model('Refund', refundSchema)