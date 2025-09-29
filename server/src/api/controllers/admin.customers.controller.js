import bcrypt from 'bcryptjs'
import User from '../models/User.js'
import ApiError from '../../utils/ApiError.js'
import catchAsync from '../../utils/catchAsync.js'

function sanitize(u) {
  return {
    id: u._id,
    firstName: u.firstName,
    lastName: u.lastName,
    username: u.username,
    email: u.email,
    roles: u.roles || ['user'],
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  }
}

export const listCustomers = catchAsync(async (req, res) => {
  const { q = '', page = 1, limit = 20 } = req.query
  const filters = []
  if (q) {
    const ql = String(q).toLowerCase()
    filters.push({
      $or: [
        { email: { $regex: ql, $options: 'i' } },
        { username: { $regex: ql, $options: 'i' } },
        { firstName: { $regex: ql, $options: 'i' } },
        { lastName: { $regex: ql, $options: 'i' } },
      ]
    })
  }
  const where = filters.length ? { $and: filters } : {}

  const pageNum = Math.max(parseInt(page, 10) || 1, 1)
  const perPage = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100)
  const skip = (pageNum - 1) * perPage

  const [items, total] = await Promise.all([
    User.find(where).sort({ createdAt: -1 }).skip(skip).limit(perPage).lean(),
    User.countDocuments(where)
  ])

  res.json({ ok: true, items: items.map(sanitize), page: pageNum, limit: perPage, total, hasMore: skip + items.length < total })
})

export const getCustomer = catchAsync(async (req, res) => {
  const { id } = req.params
  const user = await User.findById(id)
  if (!user) throw new ApiError(404, 'User not found')
  res.json({ ok: true, user: sanitize(user) })
})

// Get detailed customer information for PDF export
export const getCustomerDetails = catchAsync(async (req, res) => {
  const { id } = req.params
  const user = await User.findById(id).lean()
  if (!user) throw new ApiError(404, 'User not found')
  
  // Return full customer details (excluding sensitive fields)
  const detailedUser = {
    id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    email: user.email,
    mobile: user.mobile,
    gender: user.gender,
    birthday: user.birthday,
    country: user.country,
    roles: user.roles || ['user'],
    addresses: user.addresses || [],
    notifications: user.notifications || {
      purchases: true,
      account: true,
      events: true
    },
    emailVerified: user.emailVerified || false,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  }
  
  res.json({ ok: true, user: detailedUser })
})

export const createCustomer = catchAsync(async (req, res) => {
  const { firstName, lastName, username, email, password, roles = ['user'] } = req.body

  const exists = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }] }).lean()
  if (exists) {
    const which = exists.email === email.toLowerCase() ? 'Email' : 'Username'
    throw new ApiError(409, `${which} already in use`)
  }

  const hash = await bcrypt.hash(password, 12)
  const user = await User.create({
    firstName,
    lastName,
    username: username.toLowerCase(),
    email: email.toLowerCase(),
    password: hash,
    roles: Array.from(new Set(roles))
  })
  res.status(201).json({ ok: true, user: sanitize(user) })
})

export const updateCustomer = catchAsync(async (req, res) => {
  const { id } = req.params
  const { firstName, lastName, username, email, password, roles } = req.body

  const user = await User.findById(id).select('+password')
  if (!user) throw new ApiError(404, 'User not found')

  if (username && username !== user.username) {
    const takenU = await User.findOne({ username: username.toLowerCase(), _id: { $ne: id } }).lean()
    if (takenU) throw new ApiError(409, 'Username already in use')
    user.username = username.toLowerCase()
  }
  if (email && email !== user.email) {
    const takenE = await User.findOne({ email: email.toLowerCase(), _id: { $ne: id } }).lean()
    if (takenE) throw new ApiError(409, 'Email already in use')
    user.email = email.toLowerCase()
  }
  if (firstName) user.firstName = firstName
  if (lastName) user.lastName = lastName
  if (password) user.password = await bcrypt.hash(password, 12)
  if (Array.isArray(roles)) user.roles = Array.from(new Set(roles))

  await user.save()
  res.json({ ok: true, user: sanitize(user) })
})

export const deleteCustomer = catchAsync(async (req, res) => {
  const { id } = req.params
  const user = await User.findById(id)
  if (!user) return res.json({ ok: true })
  await user.deleteOne()
  res.json({ ok: true })
})
