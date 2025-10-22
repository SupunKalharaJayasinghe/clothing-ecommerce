import mongoose from 'mongoose'

const deliveryEventSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  fromState: { type: String, required: true },
  toState: { type: String, required: true },
  actor: { type: String, enum: ['delivery','admin','system'], default: 'delivery' },
  actorId: { type: mongoose.Schema.Types.ObjectId, refPath: 'actorModel' },
  actorModel: { type: String, enum: ['Delivery','Admin'], default: 'Delivery' },
  reason: {
    code: { type: String },
    detail: { type: String }
  },
  evidence: {
    scanRef: { type: String },
    photoUrl: { type: String },
    podPhotoUrl: { type: String },
    signatureUrl: { type: String },
    otp: { type: String }
  },
  notes: { type: String }
}, { timestamps: true })

deliveryEventSchema.index({ order: 1, createdAt: -1 })

export default mongoose.model('DeliveryEvent', deliveryEventSchema)
