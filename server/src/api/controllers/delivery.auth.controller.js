import bcrypt from 'bcryptjs'
import Delivery from '../models/Delivery.js'
import Admin from '../models/Admin.js'
import ApiError from '../../utils/ApiError.js'
import catchAsync from '../../utils/catchAsync.js'
import { signJwt } from '../../utils/jwt.js'
import { env } from '../../config/env.js'

const accessCookie = {
  httpOnly: true,
  sameSite: env.COOKIE_SAMESITE,
  secure: env.COOKIE_SECURE === 'true',
  maxAge: 7 * 24 * 60 * 60 * 1000
}

function sanitize(d) {
  return {
    id: d._id,
    fullName: `${d.firstName || ''} ${d.lastName || ''}`.trim(),
    dob: d.dob,
    phone: d.phone,
    email: d.email,
    addressLine1: d.address?.line1,
    city: d.address?.city,
    country: d.address?.country,
    govIdNumber: d.govId,
    vehicleType: d.vehicleInfo?.type || null
  }
}

export const login = catchAsync(async (req, res) => {
  const { identifier, password } = req.body
  const idLower = String(identifier || '').toLowerCase()

  let delivery = await Delivery.findOne({
    $or: [{ username: idLower }, { email: idLower }, { phone: identifier }]
  }).select('+password')

  // Fallback compatibility: allow existing Admin with delivery_agent role to sign in
  if (!delivery) {
    const admin = await Admin.findOne({ $or: [{ username: idLower }, { email: idLower }] }).select('+password roles')
    if (admin && (admin.roles || []).includes('delivery_agent')) {
      // If a delivery user with same username exists, reuse; else create it using admin's hash
      delivery = await Delivery.findOne({ username: admin.username })
      if (!delivery) {
        delivery = await Delivery.create({
          firstName: admin.firstName,
          lastName: admin.lastName,
          username: admin.username,
          email: admin.email,
          password: admin.password, // already hashed
          active: true
        })
      }
    }
  }

  if (!delivery || !delivery.active) throw new ApiError(401, 'Invalid credentials')

  // If we created from admin copy, password may already be hashed; compare works either way
  const match = await bcrypt.compare(password, delivery.password)
  if (!match) throw new ApiError(401, 'Invalid credentials')

  const token = signJwt({ kind: 'delivery', sub: delivery._id, username: delivery.username })
  res.cookie('delivery_access_token', token, accessCookie)
  res.json({ ok: true, delivery: sanitize(delivery) })
})

export const me = catchAsync(async (req, res) => {
  const d = await Delivery.findById(req.delivery.sub)
  if (!d) throw new ApiError(401, 'Invalid session')
  res.json({ ok: true, delivery: sanitize(d) })
})

export const logout = catchAsync(async (_req, res) => {
  res.clearCookie('delivery_access_token', { httpOnly: true, sameSite: env.COOKIE_SAMESITE, secure: env.COOKIE_SECURE === 'true' })
  res.json({ ok: true })
})

export const register = catchAsync(async (req, res) => {
  const b = req.body || {}

  // Contact basics
  const phone = String(b.phone || '').trim()
  if (!phone) throw new ApiError(400, 'Mobile number is required')
  const email = b.email ? String(b.email).toLowerCase() : undefined

  // Username generation (system-generated)
  const baseFromEmail = email ? email.split('@')[0] : ''
  let usernameBase = (baseFromEmail || phone).toLowerCase().replace(/[^a-z0-9_.]/g, '_')
  if (usernameBase.length < 3) usernameBase = `user_${Math.random().toString(36).slice(2,6)}`
  let username = usernameBase
  let attempt = 0
  while (await Delivery.findOne({ username })) {
    attempt += 1
    username = `${usernameBase}${attempt}`
    if (attempt > 20) break
  }

  // Ensure uniqueness across identifiers
  const exists = await Delivery.findOne({ $or: [{ phone }, { username }, { email }] })
  if (exists) throw new ApiError(409, 'Phone/username/email already in use')

  // Password policy
  if (!b.password || String(b.password).length < 8) throw new ApiError(400, 'Password must be at least 8 characters')

  // Name parsing (fullName -> first/last)
  const full = String(b.fullName || '').trim()
  if (!full) throw new ApiError(400, 'Full name is required')
  const nameParts = full.split(/\s+/)
  const lastName = nameParts.length > 1 ? nameParts.pop() : ''
  const firstName = nameParts.join(' ') || full

// Vehicle type optional is handled inline at create()

  const hash = await bcrypt.hash(b.password, 12)
  const doc = await Delivery.create({
    firstName,
    lastName,
    username,
    email,
    phone,
    password: hash,
    dob: b.dob,
    address: { line1: b.addressLine1, line2: '', city: b.city, region: '', postalCode: '', country: b.country },
    govId: b.govIdNumber,
    vehicleInfo: b.vehicleType ? { type: (b.vehicleType === 'bicycle' ? 'bike' : b.vehicleType) } : undefined,
    regions: [],
    joinedAt: new Date(),
    employeeId: `DLY-${Date.now().toString(36)}`,
    active: true
  })

  const token = signJwt({ kind: 'delivery', sub: doc._id, username: doc.username })
  res.cookie('delivery_access_token', token, accessCookie)
  res.status(201).json({ ok: true, delivery: sanitize(doc) })
})
