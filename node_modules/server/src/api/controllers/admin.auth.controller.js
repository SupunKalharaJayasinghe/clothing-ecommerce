import bcrypt from 'bcryptjs'
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

function sanitize(a) {
  return {
    id: a._id,
    firstName: a.firstName,
    lastName: a.lastName,
    username: a.username,
    email: a.email,
    roles: a.roles,
    isPrimaryAdmin: !!a.isPrimaryAdmin,
  }
}

export const login = catchAsync(async (req, res) => {
  const { identifier, password } = req.body
  const idLower = identifier.toLowerCase()

  const admin = await Admin.findOne({
    $or: [{ email: idLower }, { username: idLower }]
  }).select('+password')
  if (!admin) throw new ApiError(401, 'Invalid credentials')

  const match = await bcrypt.compare(password, admin.password)
  if (!match) throw new ApiError(401, 'Invalid credentials')

  const token = signJwt({ kind: 'admin', sub: admin._id, email: admin.email, roles: admin.roles })
  res.cookie('admin_access_token', token, accessCookie)
  res.json({ ok: true, admin: sanitize(admin) })
})

export const me = catchAsync(async (req, res) => {
  const admin = await Admin.findById(req.admin.sub)
  res.json({ ok: true, admin: sanitize(admin) })
})

export const logout = catchAsync(async (_req, res) => {
  res.clearCookie('admin_access_token', { httpOnly: true, sameSite: env.COOKIE_SAMESITE, secure: env.COOKIE_SECURE === 'true' })
  res.json({ ok: true })
})
