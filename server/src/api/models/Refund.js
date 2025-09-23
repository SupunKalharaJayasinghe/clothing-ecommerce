import mongoose from 'mongoose'

const refundSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, unique: true, index: true },
  method: { type: String, enum: ['COD','CARD','BANK'], required: true },
  amount: { type: Number, min: 0 },
  currency: { type: String, default: 'LKR' },
  status: { type: String, enum: ['REQUESTED','APPROVED','PROCESSED','FAILED','CANCELLED'], default: 'REQUESTED' },
  reason: { type: String },
  requestedAt: { type: Date, default: Date.now },
  approvedAt: { type: Date },
  processedAt: { type: Date },
  failedAt: { type: Date },
  cancelledAt: { type: Date },
  notes: { type: String },
  createdBy: { type: String, enum: ['system','admin'], default: 'admin' }
}, { timestamps: true })

refundSchema.index({ order: 1 })

export default mongoose.model('Refund', refundSchema)
