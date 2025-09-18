import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true, minlength: 2, maxlength: 60 },
    email: { type: String, unique: true, lowercase: true, required: true, index: true },
    password: { type: String, required: true, minlength: 8, select: false },
    roles: { type: [String], default: ['user'] },
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    addresses: [{
      label: String, line1: String, line2: String, city: String, region: String, postalCode: String, country: String,
      phone: String, isDefault: { type: Boolean, default: false }
    }]
  },
  { timestamps: true }
)

export default mongoose.model('User', userSchema)
