import mongoose from 'mongoose'

const returnSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
  status: { type: String, enum: ['requested','approved','rejected','received','closed'], required: true },
  reason: { type: String, trim: true },
  requestedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  closedAt: { type: Date },
  createdBy: { type: String, enum: ['user','admin','system'], default: 'admin' }
}, { timestamps: true })

returnSchema.index({ order: 1 })

export default mongoose.model('Return', returnSchema)
