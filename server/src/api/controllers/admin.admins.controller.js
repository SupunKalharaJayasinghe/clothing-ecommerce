import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import Admin from '../models/Admin.js'
import ApiError from '../../utils/ApiError.js'
import catchAsync from '../../utils/catchAsync.js'
import { ROLES } from '../../middlewares/roles.js'
import { sendVerificationCode } from '../../utils/mailer.js'
import { signJwt, verifyJwt } from '../../utils/jwt.js'

const MAIN_ADMIN_EMAIL = 'oshanrajakaruna.studies@gmail.com'

function sanitize(a) {
  return {
    id: a._id,
    firstName: a.firstName,
    lastName: a.lastName,
    username: a.username,
    email: a.email,
    roles: a.roles || [],
    isPrimaryAdmin: !!a.isPrimaryAdmin,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  }
}

export const listAdmins = catchAsync(async (req, res) => {
  const { q = '', role, page = 1, limit = 20 } = req.query
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
  if (role) {
    filters.push({ roles: role })
  }
  const where = filters.length ? { $and: filters } : {}

  const pageNum = Math.max(parseInt(page, 10) || 1, 1)
  const perPage = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100)
  const skip = (pageNum - 1) * perPage

  const [items, total] = await Promise.all([
    Admin.find(where).sort({ createdAt: -1 }).skip(skip).limit(perPage).lean(),
    Admin.countDocuments(where)
  ])

  res.json({ ok: true, items: items.map(sanitize), page: pageNum, limit: perPage, total, hasMore: skip + items.length < total })
})

export const getAdmin = catchAsync(async (req, res) => {
  const { id } = req.params
  const admin = await Admin.findById(id)
  if (!admin) throw new ApiError(404, 'Admin not found')
  res.json({ ok: true, admin: sanitize(admin) })
})

// Direct creation has been disabled; use the OTP flow (initiate + verify)
export const createAdmin = catchAsync(async (_req, _res) => {
  throw new ApiError(400, 'Admin creation requires OTP verification. Use /api/admin/admins/create/initiate and /api/admin/admins/create/verify.')
})

// Step 1: send OTP to main admin email to approve creation
export const initiateCreateAdmin = catchAsync(async (req, res) => {
  // Find main admin by configured email
  const mainEmail = MAIN_ADMIN_EMAIL.toLowerCase()
  const mainAdmin = await Admin.findOne({ email: mainEmail })
  if (!mainAdmin) throw new ApiError(400, 'Main admin email is not registered')

  // generate 6-digit code and store hash with expiry
  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0')
  const codeHash = crypto.createHash('sha256').update(code).digest('hex')
  mainAdmin.createAdminOTP = {
    codeHash,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    attempts: 0
  }
  await mainAdmin.save()

  await sendVerificationCode({ to: mainAdmin.email, code, purpose: 'admin creation approval' })

  const tmpToken = signJwt({ kind: 'admin_create', sub: mainAdmin._id }, { expiresIn: '10m' })
  res.json({ ok: true, tmpToken })
})

// Step 2: verify code and create the admin
export const verifyCreateAdmin = catchAsync(async (req, res) => {
  const { tmpToken, code, firstName, lastName, username, email, password, roles = ['user_manager'] } = req.body

  let payload
  try { payload = verifyJwt(tmpToken) } catch { throw new ApiError(400, 'Invalid or expired creation token') }
  if (payload.kind !== 'admin_create') throw new ApiError(400, 'Invalid creation token')

  const mainAdmin = await Admin.findById(payload.sub)
  if (!mainAdmin) throw new ApiError(400, 'Main admin not found')

  const record = mainAdmin.createAdminOTP || {}
  if (!record.codeHash || !record.expiresAt || record.expiresAt < new Date()) {
    throw new ApiError(400, 'Verification code expired')
  }
  if (record.attempts >= 5) throw new ApiError(429, 'Too many attempts')

  const incomingHash = crypto.createHash('sha256').update(String(code || '')).digest('hex')
  if (incomingHash !== record.codeHash) {
    mainAdmin.createAdminOTP.attempts = (mainAdmin.createAdminOTP.attempts || 0) + 1
    await mainAdmin.save()
    throw new ApiError(400, 'Invalid verification code')
  }

  // Clear OTP after successful verification
  mainAdmin.createAdminOTP = undefined
  await mainAdmin.save()

  // Proceed with creation
  const exists = await Admin.findOne({ $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }] }).lean()
  if (exists) {
    const which = exists.email === email.toLowerCase() ? 'Email' : 'Username'
    throw new ApiError(409, `${which} already in use`)
  }

  const hash = await bcrypt.hash(password, 12)
  const admin = await Admin.create({
    firstName,
    lastName,
    username: username.toLowerCase(),
    email: email.toLowerCase(),
    password: hash,
    roles: Array.from(new Set(roles))
  })
  res.status(201).json({ ok: true, admin: sanitize(admin) })
})

export const updateAdmin = catchAsync(async (req, res) => {
  const { id } = req.params
  const { firstName, lastName, username, email, password, roles } = req.body

  const admin = await Admin.findById(id).select('+password')
  if (!admin) throw new ApiError(404, 'Admin not found')

  const isPrimary = !!admin.isPrimaryAdmin

  if (username && username !== admin.username) {
    const takenU = await Admin.findOne({ username: username.toLowerCase(), _id: { $ne: id } }).lean()
    if (takenU) throw new ApiError(409, 'Username already in use')
    admin.username = username.toLowerCase()
  }
  if (email && email !== admin.email) {
    const takenE = await Admin.findOne({ email: email.toLowerCase(), _id: { $ne: id } }).lean()
    if (takenE) throw new ApiError(409, 'Email already in use')
    admin.email = email.toLowerCase()
  }
  if (firstName) admin.firstName = firstName
  if (lastName) admin.lastName = lastName
  if (password) admin.password = await bcrypt.hash(password, 12)

  if (Array.isArray(roles)) {
    const uniqueRoles = Array.from(new Set(roles))
    if (isPrimary) {
      if (!uniqueRoles.includes(ROLES.ADMIN)) {
        throw new ApiError(400, 'Cannot remove admin role from the primary admin')
      }
    }
    admin.roles = uniqueRoles
  }

  await admin.save()
  res.json({ ok: true, admin: sanitize(admin) })
})

export const deleteAdmin = catchAsync(async (req, res) => {
  const { id } = req.params
  const admin = await Admin.findById(id)
  if (!admin) return res.json({ ok: true })
  if (admin.isPrimaryAdmin) throw new ApiError(400, 'Cannot remove the primary admin')
  await admin.deleteOne()
  res.json({ ok: true })
})
