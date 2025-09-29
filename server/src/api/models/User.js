import mongoose from 'mongoose'

const addressSchema = new mongoose.Schema({
  label: { type: String, trim: true },
  line1: { type: String, required: true, trim: true },
  line2: { type: String, trim: true },
  city: { type: String, required: true, trim: true },
  region: { type: String, trim: true },
  postalCode: { type: String, trim: true },
  country: { type: String, required: true, trim: true },
  phone: { type: String, trim: true },
  isDefault: { type: Boolean, default: false }
}, { _id: true, timestamps: true })

const paymentMethodSchema = new mongoose.Schema({
  type: { type: String, enum: ['card'], required: true },
  gateway: { type: String, enum: ['PAYHERE'], required: true },
  label: { type: String, trim: true },
  brand: { type: String, trim: true },
  last4: { type: String, trim: true },
  expMonth: Number,
  expYear: Number,
  tokenId: { type: String, trim: true, index: true },
}, { _id: true, timestamps: true })

const twoFASchema = new mongoose.Schema({
  enabled: { type: Boolean, default: false },
  secret: { type: String },
  tempSecret: { type: String },
  backupCodes: [{ type: String }],
  preferredMethod: { type: String, enum: ['email','totp'], default: undefined }
}, { _id: false })

const passwordResetSchema = new mongoose.Schema({
  tokenHash: { type: String },
  expiresAt: { type: Date }
}, { _id: false })

const deletionRequestSchema = new mongoose.Schema({
  status: { type: String, enum: ['pending', 'cancelled', 'approved', 'rejected'], default: 'pending' },
  reason: { type: String, trim: true },
  requestedAt: { type: Date },
  updatedAt: { type: Date }
}, { _id: false })

// Generic one-time code storage
const otpSchema = new mongoose.Schema({
  codeHash: { type: String },
  expiresAt: { type: Date },
  attempts: { type: Number, default: 0 }
}, { _id: false })

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    lastName:  { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    username:  {
      type: String, required: true, unique: true, index: true, trim: true, lowercase: true,
      minlength: 3, maxlength: 30, match: /^[a-z0-9_\.]+$/
    },
    email: { type: String, required: true, unique: true, index: true, trim: true, lowercase: true },
    password: { type: String, required: true, select: false, minlength: 8 },

    mobile: { type: String, trim: true },
    gender: { type: String, enum: ['male','female','other','prefer_not_to_say'], default: 'prefer_not_to_say' },
    birthday: { type: Date },
    country: { type: String, trim: true },

    roles: { type: [String], default: ['user'] },

    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    addresses: [addressSchema],
    paymentMethods: [paymentMethodSchema],
    twoFA: twoFASchema,
    notifications: {
      purchases: { type: Boolean, default: true },
      account: { type: Boolean, default: true },
      events: { type: Boolean, default: true }
    },

    passwordReset: passwordResetSchema,
    deletionRequest: deletionRequestSchema,

    // Email verification state
    emailVerified: { type: Boolean, default: false },
    emailVerification: otpSchema,
    // Login-time email OTP
    loginOTP: otpSchema
  },
  { timestamps: true }
)

userSchema.virtual('name').get(function () {
  return `${this.firstName} ${this.lastName}`.trim()
})

export default mongoose.model('User', userSchema)
