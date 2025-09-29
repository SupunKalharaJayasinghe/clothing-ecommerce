import bcrypt from 'bcryptjs'
import User from '../models/User.js'
import ApiError from '../../utils/ApiError.js'
import catchAsync from '../../utils/catchAsync.js'
import { authenticator } from 'otplib'
import QRCode from 'qrcode'

// -- helpers --
function sanitize(u) {
  return {
    id: u._id,
    firstName: u.firstName,
    lastName: u.lastName,
    username: u.username,
    email: u.email,
    mobile: u.mobile || '',
    gender: u.gender || 'prefer_not_to_say',
    birthday: u.birthday || null,
    country: u.country || '',
    notifications: u.notifications,
    addresses: u.addresses,
    paymentMethods: u.paymentMethods?.map(pm => ({
      _id: pm._id, type: pm.type, gateway: pm.gateway,
      label: pm.label, brand: pm.brand, last4: pm.last4, expMonth: pm.expMonth, expYear: pm.expYear
    })) || [],
    twoFA: { enabled: !!u.twoFA?.enabled }
  }
}

// --- PROFILE ---
export const getProfile = catchAsync(async (req, res) => {
  const u = await User.findById(req.user.sub)
  res.json({ ok: true, user: sanitize(u) })
})

export const updateProfile = catchAsync(async (req, res) => {
  const { firstName, lastName, username, email, mobile, gender, birthday, country } = req.body
  const user = await User.findById(req.user.sub)

  if (username && username !== user.username) {
    const takenU = await User.findOne({ username: username.toLowerCase() }).lean()
    if (takenU) throw new ApiError(409, 'Username already in use')
    user.username = username.toLowerCase()
  }
  if (email && email !== user.email) {
    const takenE = await User.findOne({ email: email.toLowerCase() }).lean()
    if (takenE) throw new ApiError(409, 'Email already in use')
    user.email = email.toLowerCase()
  }

  user.firstName = firstName
  user.lastName  = lastName
  user.mobile    = mobile || ''
  user.gender    = gender
  user.birthday  = birthday ? new Date(birthday) : null
  user.country   = country || ''

  await user.save()
  res.json({ ok: true, user: sanitize(user) })
})

// --- PASSWORD ---
export const changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body
  const user = await User.findById(req.user.sub).select('+password')
  if (!user) throw new ApiError(404, 'User not found')

  const ok = await bcrypt.compare(currentPassword, user.password)
  if (!ok) throw new ApiError(401, 'Current password is incorrect')

  user.password = await bcrypt.hash(newPassword, 12)
  await user.save()
  res.json({ ok: true })
})

// --- ADDRESSES ---
export const listAddresses = catchAsync(async (req, res) => {
  const user = await User.findById(req.user.sub, 'addresses')
  // return default first (stable for UI dropdowns)
  const items = [...(user.addresses || [])].sort((a, b) => (b.isDefault === true) - (a.isDefault === true))
  res.json({ ok: true, items })
})

export const createAddress = catchAsync(async (req, res) => {
  const user = await User.findById(req.user.sub)
  const addr = user.addresses.create(req.body)
  if (req.body.isDefault) {
    user.addresses.forEach(a => a.isDefault = false)
    addr.isDefault = true
  }
  // If this is the first address or no existing default, set as default
  const hasDefault = user.addresses.some(a => a.isDefault)
  if (user.addresses.length === 0 || !hasDefault) {
    user.addresses.forEach(a => a.isDefault = false)
    addr.isDefault = true
  }
  user.addresses.push(addr)
  await user.save()
  res.status(201).json({ ok: true, address: addr })
})

export const updateAddress = catchAsync(async (req, res) => {
  const { id } = req.params
  const user = await User.findById(req.user.sub)
  const addr = user.addresses.id(id)
  if (!addr) throw new ApiError(404, 'Address not found')

  Object.assign(addr, req.body)
  if (req.body.isDefault) {
    user.addresses.forEach(a => a.isDefault = (a._id.toString() === id))
  }
  await user.save()
  res.json({ ok: true, address: addr })
})

export const deleteAddress = catchAsync(async (req, res) => {
  const { id } = req.params
  const user = await User.findById(req.user.sub)
  const addr = user.addresses.id(id)
  if (!addr) throw new ApiError(404, 'Address not found')
  const wasDefault = !!addr.isDefault
  addr.deleteOne()
  // If we deleted the default, promote the first remaining address as default
  if (wasDefault && user.addresses.length > 0) {
    user.addresses.forEach((a, idx) => { a.isDefault = idx === 0 })
  }
  await user.save()
  res.json({ ok: true })
})

// --- NOTIFICATIONS ---
export const getNotifications = catchAsync(async (req, res) => {
  const user = await User.findById(req.user.sub, 'notifications')
  res.json({ ok: true, notifications: user.notifications })
})

export const updateNotifications = catchAsync(async (req, res) => {
  const user = await User.findById(req.user.sub)
  user.notifications = req.body
  await user.save()
  res.json({ ok: true, notifications: user.notifications })
})

// --- PAYMENT METHODS (tokenized only) ---
export const listPaymentMethods = catchAsync(async (req, res) => {
  const user = await User.findById(req.user.sub, 'paymentMethods')
  res.json({ ok: true, items: user.paymentMethods })
})

export const addPaymentMethod = catchAsync(async (req, res) => {
  const user = await User.findById(req.user.sub)
  const pm = user.paymentMethods.create(req.body)
  if (user.paymentMethods.some(x => x.tokenId === pm.tokenId)) {
    return res.status(200).json({ ok: true, paymentMethod: user.paymentMethods.find(x => x.tokenId === pm.tokenId) })
  }
  user.paymentMethods.push(pm)
  await user.save()
  res.status(201).json({ ok: true, paymentMethod: pm })
})

export const removePaymentMethod = catchAsync(async (req, res) => {
  const { id } = req.params
  const user = await User.findById(req.user.sub)
  const pm = user.paymentMethods.id(id)
  if (!pm) throw new ApiError(404, 'Payment method not found')
  pm.deleteOne()
  await user.save()
  res.json({ ok: true })
})

// --- 2FA (TOTP) ---
export const start2FASetup = catchAsync(async (req, res) => {
  const user = await User.findById(req.user.sub)
  const secret = authenticator.generateSecret()
  user.twoFA = user.twoFA || {}
  user.twoFA.tempSecret = secret
  await user.save()

  const otpauth = authenticator.keyuri(user.email, 'MERN Store', secret)
  const qrDataUrl = await QRCode.toDataURL(otpauth)
  res.json({ ok: true, otpauth, qrDataUrl })
})

export const verify2FASetup = catchAsync(async (req, res) => {
  const { token } = req.body
  const user = await User.findById(req.user.sub)
  const secret = user.twoFA?.tempSecret
  if (!secret) throw new ApiError(400, 'No setup in progress')

  const valid = authenticator.verify({ token, secret })
  if (!valid) throw new ApiError(400, 'Invalid code')

  user.twoFA.secret = secret
  user.twoFA.enabled = true
  user.twoFA.tempSecret = undefined

  const codes = Array.from({ length: 10 }).map(() => Math.random().toString(36).slice(-10))
  user.twoFA.backupCodes = codes
  await user.save()

  res.json({ ok: true, backupCodes: codes })
})

export const disable2FA = catchAsync(async (req, res) => {
  const user = await User.findById(req.user.sub)
  user.twoFA = { enabled: false, secret: undefined, tempSecret: undefined, backupCodes: [] }
  await user.save()
  res.json({ ok: true })
})

export const regen2FACodes = catchAsync(async (req, res) => {
  const user = await User.findById(req.user.sub)
  if (!user.twoFA?.enabled) throw new ApiError(400, '2FA is not enabled')
  const codes = Array.from({ length: 10 }).map(() => Math.random().toString(36).slice(-10))
  user.twoFA.backupCodes = codes
  await user.save()
  res.json({ ok: true, backupCodes: codes })
})

// --- ACCOUNT DELETION REQUEST ---
export const getDeletionRequest = catchAsync(async (req, res) => {
  const user = await User.findById(req.user.sub, 'deletionRequest')
  const dr = user.deletionRequest
  res.json({
    ok: true,
    deletionRequest: dr ? {
      status: dr.status,
      reason: dr.reason || '',
      requestedAt: dr.requestedAt,
      updatedAt: dr.updatedAt
    } : null
  })
})

export const createDeletionRequest = catchAsync(async (req, res) => {
  const { reason } = req.body
  const user = await User.findById(req.user.sub)

  user.deletionRequest = {
    status: 'pending',
    reason: reason || '',
    requestedAt: new Date(),
    updatedAt: new Date()
  }
  await user.save()

  // TODO: notify admins by email/webhook
  res.status(201).json({ ok: true, deletionRequest: user.deletionRequest })
})

export const cancelDeletionRequest = catchAsync(async (req, res) => {
  const user = await User.findById(req.user.sub)
  if (!user.deletionRequest) return res.json({ ok: true, deletionRequest: null })

  user.deletionRequest.status = 'cancelled'
  user.deletionRequest.updatedAt = new Date()
  await user.save()

  res.json({ ok: true, deletionRequest: user.deletionRequest })
})
