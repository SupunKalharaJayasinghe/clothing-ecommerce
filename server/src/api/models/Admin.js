import mongoose from 'mongoose'

// Generic one-time code storage for login verification
const otpSchema = new mongoose.Schema({
  codeHash: { type: String },
  expiresAt: { type: Date },
  attempts: { type: Number, default: 0 }
}, { _id: false })

const adminSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
  lastName:  { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
  username:  {
    type: String, required: true, unique: true, index: true, trim: true, lowercase: true,
    minlength: 3, maxlength: 30, match: /^[a-z0-9_\.]+$/
  },
  email: { type: String, required: true, unique: true, index: true, trim: true, lowercase: true },
  password: { type: String, required: true, select: false, minlength: 8 },

  roles: { type: [String], default: ['user_manager'] },
  // Single, non-removable primary admin account
  isPrimaryAdmin: { type: Boolean, default: false },

  // Login-time email OTP for admins
  loginOTP: otpSchema,

  // OTP for approving creation of new admin accounts
  createAdminOTP: otpSchema,
}, { timestamps: true })

adminSchema.virtual('name').get(function () {
  return `${this.firstName} ${this.lastName}`.trim()
})

export default mongoose.model('Admin', adminSchema)
