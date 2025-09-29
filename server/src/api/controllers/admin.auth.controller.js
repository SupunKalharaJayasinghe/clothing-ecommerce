import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import Admin from '../models/Admin.js'
import ApiError from '../../utils/ApiError.js'
import catchAsync from '../../utils/catchAsync.js'
import { signJwt, verifyJwt } from '../../utils/jwt.js'
import { env } from '../../config/env.js'
import { sendVerificationCode } from '../../utils/mailer.js'

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

// Step 1: password check → send email code
export const login = catchAsync(async (req, res) => {
  const { identifier, password } = req.body
  const idLower = identifier.toLowerCase()

  const admin = await Admin.findOne({
    $or: [{ email: idLower }, { username: idLower }]
  }).select('+password')
  if (!admin) throw new ApiError(401, 'Invalid credentials')

  const match = await bcrypt.compare(password, admin.password)
  if (!match) throw new ApiError(401, 'Invalid credentials')

  // Generate 6-digit OTP and email it to the admin
  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0')
  const codeHash = crypto.createHash('sha256').update(code).digest('hex')
  admin.loginOTP = {
    codeHash,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    attempts: 0
  }
  await admin.save()
  await sendVerificationCode({ to: admin.email, code, purpose: 'login' })

  const tmpToken = signJwt({ kind: 'admin_email_login', sub: admin._id }, { expiresIn: '10m' })
  res.json({ ok: true, emailLoginRequired: true, tmpToken })
})

// Step 2: verify email code → issue admin session cookie
export const verifyEmailOnLogin = catchAsync(async (req, res) => {
  const { tmpToken, code } = req.body
  let payload
  try { payload = verifyJwt(tmpToken) } catch { throw new ApiError(400, 'Invalid or expired login token') }
  if (payload.kind !== 'admin_email_login') throw new ApiError(400, 'Invalid login token')

  const admin = await Admin.findById(payload.sub)
  if (!admin) throw new ApiError(400, 'Admin not found')

  const record = admin.loginOTP || {}
  if (!record.codeHash || !record.expiresAt || record.expiresAt < new Date()) {
    throw new ApiError(400, 'Verification code expired')
  }
  if (record.attempts >= 5) throw new ApiError(429, 'Too many attempts')

  const incomingHash = crypto.createHash('sha256').update(String(code || '')).digest('hex')
  if (incomingHash !== record.codeHash) {
    admin.loginOTP.attempts = (admin.loginOTP.attempts || 0) + 1
    await admin.save()
    throw new ApiError(400, 'Invalid verification code')
  }

  admin.loginOTP = undefined
  await admin.save()

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
