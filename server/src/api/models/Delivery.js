import mongoose from 'mongoose'

const otpSchema = new mongoose.Schema({
  codeHash: { type: String },
  expiresAt: { type: Date },
  attempts: { type: Number, default: 0 }
}, { _id: false })

const deliverySchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
  lastName:  { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
  username:  { type: String, required: true, unique: true, index: true, trim: true, lowercase: true, minlength: 3, maxlength: 30, match: /^[a-z0-9_\.]+$/ },
  email:     { type: String, trim: true, lowercase: true, index: true },
  phone:     { type: String, trim: true, index: true, unique: true, required: true },
  altPhone:  { type: String, trim: true },
  password:  { type: String, required: true, select: false, minlength: 8 },

  // Personal
  gender:    { type: String, enum: ['male','female','other'], trim: true },
  dob:       { type: Date },
  profilePhotoUrl: { type: String, trim: true },

  // Address
  address:   {
    line1: { type: String, required: true, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    region: { type: String, trim: true },
    postalCode: { type: String, trim: true },
    country: { type: String, required: true, trim: true }
  },

  // Identity & verification
  govId:     { type: String, required: true, trim: true },
  govIdInfo: { type: new mongoose.Schema({ type: String, number: String, expiry: Date, photoUrl: String }, { _id: false }) },
  policeClearanceUrl: { type: String, trim: true },
  taxId:     { type: String, trim: true },

  // Employment
  employeeId: { type: String, unique: true, index: true, sparse: true },
  designation: { type: String, trim: true },
  joinedAt:   { type: Date },

  // Vehicle info (optional)
  driversLicense: {
    number: { type: String, trim: true },
    country: { type: String, trim: true },
    expiry: { type: Date },
    photoUrl: { type: String, trim: true }
  },
  vehicleInfo: {
    type: { type: String, enum: ['bike','motorbike','car','van'] },
    make: { type: String, trim: true },
    model: { type: String, trim: true },
    year: { type: Number },
    plate: { type: String, trim: true },
    registrationDocUrl: { type: String, trim: true },
    insurancePolicyNumber: { type: String, trim: true },
    insuranceExpiry: { type: Date },
    insuranceDocUrl: { type: String, trim: true },
    color: { type: String, trim: true },
    capacityKg: { type: Number, default: 0 },
    capacityL: { type: Number, default: 0 }
  },

  // Banking & payout
  payoutBank: {
    bankName: { type: String, trim: true },
    provider: { type: String, trim: true },
    accountName: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    walletId: { type: String, trim: true },
    iban: { type: String, trim: true },
    swift: { type: String, trim: true },
    upiId: { type: String, trim: true },
    branchCode: { type: String, trim: true }
  },

  // Scheduling & preferences
  availability: {
    days: { type: [String], default: [] },
    hours: { start: String, end: String },
    shifts: { type: [String], default: [] }
  },

  // Zones & regions
  zones: {
    preferred: { type: [String], default: [] },
    blocked: { type: [String], default: [] },
    homeRadiusKm: { type: Number, default: 0 }
  },

  maxOrderSize: { type: Number, default: 0 },
  device: { os: { type: String, enum: ['ios','android','other'], default: 'android' }, dataPlan: { type: Boolean, default: true } },
  emergency: { name: String, relationship: String, phone: String },
  languages: { type: [String], default: [] },
  commPreference: { type: String, enum: ['call','sms','in-app'], default: 'call' },

  active:    { type: Boolean, default: true },
  regions:   { type: [String], default: [] },
  lastSeenAt:{ type: Date },

  // Login-time email OTP
  loginOTP: otpSchema
}, { timestamps: true })

export default mongoose.model('Delivery', deliverySchema)
