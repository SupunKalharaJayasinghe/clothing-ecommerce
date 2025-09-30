import bcrypt from 'bcryptjs'
import Delivery from '../models/Delivery.js'
import ApiError from '../../utils/ApiError.js'
import catchAsync from '../../utils/catchAsync.js'

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

export const listDelivery = catchAsync(async (req, res) => {
  const { q = '', active, page = 1, limit = 20 } = req.query
  const filters = []
  if (q) {
    const rx = new RegExp(String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    filters.push({ $or: [{ username: rx }, { email: rx }, { phone: rx }, { firstName: rx }, { lastName: rx }] })
  }
  if (active === 'true') filters.push({ $or: [ { active: true }, { active: { $exists: false } } ] })
  if (active === 'false') filters.push({ active: false })
  const where = filters.length ? { $and: filters } : {}

  const pageNum = Math.max(parseInt(page, 10) || 1, 1)
  const perPage = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100)
  const skip = (pageNum - 1) * perPage

  const [items, total] = await Promise.all([
    Delivery.find(where).sort({ createdAt: -1 }).skip(skip).limit(perPage).lean(),
    Delivery.countDocuments(where)
  ])

  res.json({ ok: true, items: items.map(sanitize), page: pageNum, limit: perPage, total, hasMore: skip + items.length < total })
})

export const getDelivery = catchAsync(async (req, res) => {
  const { id } = req.params
  const d = await Delivery.findById(id)
  if (!d) throw new ApiError(404, 'Delivery user not found')
  res.json({ ok: true, delivery: sanitize(d) })
})

export const getDeliveryDetails = catchAsync(async (req, res) => {
  const { id } = req.params
  const d = await Delivery.findById(id).lean()
  if (!d) throw new ApiError(404, 'Delivery user not found')
  
  // Include additional details for detailed report
  const deliveryDetails = {
    ...d,
    fullName: `${d.firstName || ''} ${d.lastName || ''}`.trim(),
    addressLine1: d.address?.line1 || 'N/A',
    addressLine2: d.address?.line2 || '',
    city: d.address?.city || 'N/A',
    region: d.address?.region || '',
    postalCode: d.address?.postalCode || '',
    country: d.address?.country || 'N/A',
    vehicleType: d.vehicleInfo?.type || 'N/A',
    isActive: d.active !== false,
    totalRegions: d.regions?.length || 0
  }
  
  res.json({ ok: true, delivery: deliveryDetails })
})

export const createDelivery = catchAsync(async (req, res) => {
  const b = req.body || {}

  const email = b.email ? String(b.email).toLowerCase() : undefined
  const phone = String(b.phone || '').trim()
  if (!phone) throw new ApiError(400, 'Phone is required')

  // Generate username from email local-part or phone
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

  // Enforce unique constraints
  const exists = await Delivery.findOne({ $or: [{ username }, { email }, { phone }] })
  if (exists) throw new ApiError(409, 'Username, email or phone already in use')

  const passwordHash = await bcrypt.hash(b.password, 12)

  // Split fullName
  const parts = String(b.fullName || '').trim().split(/\s+/)
  const lastName = parts.length > 1 ? parts.pop() : ''
  const firstName = parts.join(' ') || b.fullName

  const doc = await Delivery.create({
    firstName,
    lastName,
    username,
    email,
    phone,
    password: passwordHash,
    dob: b.dob,
    address: { line1: b.addressLine1, line2: '', city: b.city, region: '', postalCode: '', country: b.country },
    govId: b.govIdNumber,
    vehicleInfo: b.vehicleType ? { type: (b.vehicleType === 'bicycle' ? 'bike' : b.vehicleType) } : undefined,
    regions: [],
    active: true
  })
  res.status(201).json({ ok: true, delivery: sanitize(doc) })
})

export const updateDelivery = catchAsync(async (req, res) => {
  const { id } = req.params
  const b = req.body || {}

  const d = await Delivery.findById(id).select('+password')
  if (!d) throw new ApiError(404, 'Delivery user not found')

  // Update email (unique)
  if (b.email && b.email !== d.email) {
    const takenE = await Delivery.findOne({ email: b.email.toLowerCase(), _id: { $ne: id } })
    if (takenE) throw new ApiError(409, 'Email already in use')
    d.email = b.email.toLowerCase()
  }
  // Update phone (unique)
  if (b.phone && b.phone !== d.phone) {
    const takenP = await Delivery.findOne({ phone: b.phone, _id: { $ne: id } })
    if (takenP) throw new ApiError(409, 'Phone already in use')
    d.phone = b.phone
  }

  // Update name from fullName
  if (b.fullName) {
    const parts = String(b.fullName).trim().split(/\s+/)
    const lastName = parts.length > 1 ? parts.pop() : ''
    const firstName = parts.join(' ') || b.fullName
    d.firstName = firstName
    d.lastName = lastName
  }

  if (b.dob) d.dob = b.dob
  if (b.addressLine1 || b.city || b.country) {
    d.address = {
      line1: b.addressLine1 || d.address?.line1,
      line2: d.address?.line2 || '',
      city: b.city || d.address?.city,
      region: d.address?.region || '',
      postalCode: d.address?.postalCode || '',
      country: b.country || d.address?.country
    }
  }
  if (b.govIdNumber) d.govId = b.govIdNumber
  if (b.vehicleType) d.vehicleInfo = { type: (b.vehicleType === 'bicycle' ? 'bike' : b.vehicleType) }
  if (b.password) d.password = await bcrypt.hash(b.password, 12)

  await d.save()
  res.json({ ok: true, delivery: sanitize(d) })
})

export const deleteDelivery = catchAsync(async (req, res) => {
  const { id } = req.params
  const d = await Delivery.findById(id)
  if (!d) return res.json({ ok: true })
  await d.deleteOne()
  res.json({ ok: true })
})
