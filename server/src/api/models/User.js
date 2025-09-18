import mongoose from 'mongoose'

const addressSchema = new mongoose.Schema({
  label: String,
  line1: String,
  line2: String,
  city: String,
  region: String,
  postalCode: String,
  country: String,
  phone: String,
  isDefault: { type: Boolean, default: false }
}, { _id: false })

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    lastName:  { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    username:  {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      lowercase: true, // enforce case-insensitive uniqueness
      minlength: 3,
      maxlength: 30,
      match: /^[a-z0-9_\.]+$/ // letters/numbers/underscore/dot
    },
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      lowercase: true
    },
    password: {
      type: String,
      required: true,
      select: false, // never return by default
      minlength: 8
    },
    roles: { type: [String], default: ['user'] },
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    addresses: [addressSchema]
  },
  { timestamps: true }
)

userSchema.virtual('name').get(function () {
  return `${this.firstName} ${this.lastName}`.trim()
})

export default mongoose.model('User', userSchema)
