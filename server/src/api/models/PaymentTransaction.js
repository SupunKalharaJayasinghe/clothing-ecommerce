import mongoose from 'mongoose'

const paymentTransactionSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  method: { type: String, enum: ['COD','CARD','BANK'], required: true },
  action: { type: String, enum: ['CREATED','STATUS_UPDATED','WEBHOOK','SLIP_UPLOADED','BANK_VERIFIED','COD_COLLECTION'], required: true },
  status: { type: String, enum: ['UNPAID','PENDING','AUTHORIZED','PAID','FAILED','REFUND_PENDING','REFUNDED'], required: true },
  amount: { type: Number },
  currency: { type: String, default: 'LKR' },
  gateway: { type: String, enum: ['PAYHERE'], default: undefined },
  gatewayRef: { type: String },
  notes: { type: String },
  meta: { type: Object },
  createdBy: { type: String, enum: ['system','user','webhook','admin','delivery'], default: 'system' }
}, { timestamps: true })

paymentTransactionSchema.index({ order: 1, createdAt: -1 })

export default mongoose.model('PaymentTransaction', paymentTransactionSchema)
