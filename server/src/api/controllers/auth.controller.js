import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import User from '../models/User.js'
import ApiError from '../../utils/ApiError.js'
import catchAsync from '../../utils/catchAsync.js'
import { signJwt, verifyJwt } from '../../utils/jwt.js'
import { env } from '../../config/env.js'
import { authenticator } from 'otplib'
import { sendVerificationCode } from '../../utils/mailer.js'

const accessCookie = {
  httpOnly: true,
  sameSite: env.COOKIE_SAMESITE,
  secure: env.COOKIE_SECURE === 'true',
  maxAge: 7 * 24 * 60 * 60 * 1000
}
const remember2faCookie = {
  httpOnly: true,
  sameSite: env.COOKIE_SAMESITE,
  secure: env.COOKIE_SECURE === 'true',
  maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
}

function sanitize(user) {
  return {
    id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    email: user.email,
    roles: user.roles
  }
}

/* ---------- REGISTER ---------- */
export const register = catchAsync(async (req, res) => {
  const { firstName, lastName, username, email, password } = req.body

  const existing = await User.findOne({
    $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }]
  }).lean()
  if (existing) {
    const which = existing.email === email.toLowerCase() ? 'Email' : 'Username'
    throw new ApiError(409, `${which} already in use`)
  }

  const hash = await bcrypt.hash(password, 12)
  const user = await User.create({
    firstName,
    lastName,
    username: username.toLowerCase(),
    email: email.toLowerCase(),
    password: hash,
    emailVerified: false
  })

  // Generate 6-digit verification code
  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0')
  const codeHash = crypto.createHash('sha256').update(code).digest('hex')
  user.emailVerification = {
    codeHash,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    attempts: 0
  }
  await user.save()

  await sendVerificationCode({ to: user.email, code, purpose: 'email verification' })

  const tmpToken = signJwt({ kind: 'email_verify', sub: user._id }, { expiresIn: '10m' })
  res.status(201).json({ ok: true, verificationRequired: true, tmpToken })
})

/* ---------- LOGIN with 2FA challenge ---------- */
export const login = catchAsync(async (req, res) => {
  const { identifier, password } = req.body
  const idLower = identifier.toLowerCase()

  const user = await User.findOne({
    $or: [{ email: idLower }, { username: idLower }]
  }).select('+password')

  if (!user) throw new ApiError(401, 'Invalid credentials')

  const match = await bcrypt.compare(password, user.password)
  if (!match) throw new ApiError(401, 'Invalid credentials')

  // If a 2FA remember cookie is present and valid for this user, bypass second factor
  if (user.twoFA?.enabled) {
    try {
      const remember = req.cookies?.twofa_remember
      if (remember) {
        const r = verifyJwt(remember)
        if (r?.kind === '2fa_remember' && String(r.sub) === String(user._id)) {
          const token = signJwt({ sub: user._id, email: user.email, roles: user.roles })
          res.cookie('access_token', token, accessCookie)
          return res.json({ ok: true, user: sanitize(user) })
        }
      }
    } catch {/* ignore invalid remember cookie */}
  }

  // If 2FA is enabled, ALWAYS ask to choose method on each login
  if (user.twoFA?.enabled) {
    const tmp = signJwt({ kind: 'login_method', sub: user._id }, { expiresIn: '10m' })
    return res.json({ ok: true, chooseMethodRequired: true, methods: ['email','totp'], tmpToken: tmp })
  }

  // If 2FA is not enabled, use email code as before
  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0')
  const codeHash = crypto.createHash('sha256').update(code).digest('hex')
  user.loginOTP = {
    codeHash,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    attempts: 0
  }
  await user.save()
  await sendVerificationCode({ to: user.email, code, purpose: 'login' })

  const tmpToken = signJwt({ kind: 'email_login', sub: user._id }, { expiresIn: '10m' })
  return res.json({ ok: true, emailLoginRequired: true, tmpToken })
})

/* ---------- VERIFY 2FA ---------- */
export const verify2FAOnLogin = catchAsync(async (req, res) => {
  const { tmpToken, code, remember } = req.body
  let payload
  try {
    payload = verifyJwt(tmpToken)
  } catch {
    throw new ApiError(400, 'Invalid or expired 2FA token')
  }
  if (payload.kind !== '2fa') throw new ApiError(400, 'Invalid 2FA token')

  const user = await User.findById(payload.sub)
  if (!user?.twoFA?.enabled) throw new ApiError(400, '2FA is not enabled for this account')

  const isTotp = authenticator.verify({ token: code, secret: user.twoFA.secret })
  const isBackup = user.twoFA.backupCodes?.includes(code)

  if (!isTotp && !isBackup) throw new ApiError(400, 'Invalid 2FA code')

  if (isBackup) {
    // one-time use backup code
    user.twoFA.backupCodes = user.twoFA.backupCodes.filter(c => c !== code)
    await user.save()
  }

  const token = signJwt({ sub: user._id, email: user.email, roles: user.roles })
  res.cookie('access_token', token, accessCookie)

  if (remember) {
    const rem = signJwt({ kind: '2fa_remember', sub: user._id }, { expiresIn: '30d' })
    res.cookie('twofa_remember', rem, remember2faCookie)
  }

  res.json({ ok: true, user: sanitize(user) })
})

export const chooseLoginMethod = catchAsync(async (req, res) => {
  const { tmpToken, method } = req.body
  let payload
  try {
    payload = verifyJwt(tmpToken)
  } catch {
    throw new ApiError(400, 'Invalid or expired token')
  }
  if (payload.kind !== 'login_method') throw new ApiError(400, 'Invalid token kind')

  const user = await User.findById(payload.sub).select('+password')
  if (!user) throw new ApiError(400, 'User not found')

if (method === 'totp') {
    if (!user.twoFA?.enabled || !user.twoFA?.secret) {
      throw new ApiError(400, 'TOTP is not enabled for this account')
    }
    const twofaTmp = signJwt({ kind: '2fa', sub: user._id }, { expiresIn: '5m' })
    return res.json({ ok: true, twoFARequired: true, tmpToken: twofaTmp })
  }

  if (method === 'email') {
    const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0')
    const codeHash = crypto.createHash('sha256').update(code).digest('hex')
    user.loginOTP = {
      codeHash,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      attempts: 0
    }
    await user.save()
    await sendVerificationCode({ to: user.email, code, purpose: 'login' })
    const emailTmp = signJwt({ kind: 'email_login', sub: user._id }, { expiresIn: '10m' })
    return res.json({ ok: true, emailLoginRequired: true, tmpToken: emailTmp })
  }

  throw new ApiError(400, 'Unknown method')
})

/* ---------- RESEND EMAIL CODE (LOGIN) ---------- */
export const resendEmailLoginCode = catchAsync(async (req, res) => {
  const { tmpToken } = req.body
  let payload
  try {
    payload = verifyJwt(tmpToken)
  } catch {
    throw new ApiError(400, 'Invalid or expired token')
  }
  if (payload.kind !== 'email_login') throw new ApiError(400, 'Invalid token kind')

  const user = await User.findById(payload.sub)
  if (!user) throw new ApiError(400, 'User not found')

  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0')
  const codeHash = crypto.createHash('sha256').update(code).digest('hex')
  user.loginOTP = {
    codeHash,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    attempts: 0
  }
  await user.save()
  await sendVerificationCode({ to: user.email, code, purpose: 'login' })

  const freshTmp = signJwt({ kind: 'email_login', sub: user._id }, { expiresIn: '10m' })
  res.json({ ok: true, message: 'Verification code resent', tmpToken: freshTmp })
})

/* ---------- ME / LOGOUT ---------- */
export const me = catchAsync(async (req, res) => {
  const user = await User.findById(req.user.sub)
  res.json({ ok: true, user: sanitize(user) })
})

export const logout = catchAsync(async (_req, res) => {
  res.clearCookie('access_token', { httpOnly: true, sameSite: env.COOKIE_SAMESITE, secure: env.COOKIE_SECURE === 'true' })
  res.clearCookie('twofa_remember', { httpOnly: true, sameSite: env.COOKIE_SAMESITE, secure: env.COOKIE_SECURE === 'true' })
  res.json({ ok: true })
})

/* ---------- FORGOT / RESET PASSWORD ---------- */
export const forgotPassword = catchAsync(async (req, res) => {
  const { identifier } = req.body
  const idLower = identifier.toLowerCase()

  const user = await User.findOne({ $or: [{ email: idLower }, { username: idLower }] })
  if (!user) {
    // avoid user enumeration
    return res.json({ ok: true, message: 'If the account exists, a reset link has been sent.' })
  }

  // generate token and store hash
  const raw = crypto.randomBytes(32).toString('hex') // token sent to user
  const tokenHash = crypto.createHash('sha256').update(raw).digest('hex')
  user.passwordReset = {
    tokenHash,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
  }
  await user.save()

  // TODO: send email with link containing `raw` token
  // For dev, return token so you can test
  res.json({
    ok: true,
    message: 'If the account exists, a reset link has been sent.',
    devToken: raw
  })
})

export const resetPassword = catchAsync(async (req, res) => {
  const { token, newPassword } = req.body
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

  const user = await User.findOne({
    'passwordReset.tokenHash': tokenHash,
    'passwordReset.expiresAt': { $gt: new Date() }
  }).select('+password')

  if (!user) throw new ApiError(400, 'Invalid or expired reset token')

  user.password = await bcrypt.hash(newPassword, 12)
  user.passwordReset = { tokenHash: undefined, expiresAt: undefined }
  await user.save()

  res.json({ ok: true, message: 'Password updated' })
})

/* ---------- VERIFY EMAIL ON REGISTER ---------- */
export const verifyEmailOnRegister = catchAsync(async (req, res) => {
  const { tmpToken, code } = req.body
  let payload
  try { payload = verifyJwt(tmpToken) } catch { throw new ApiError(400, 'Invalid or expired verification token') }
  if (payload.kind !== 'email_verify') throw new ApiError(400, 'Invalid verification token')

  const user = await User.findById(payload.sub)
  if (!user) throw new ApiError(400, 'User not found')

  const record = user.emailVerification || {}
  if (!record.codeHash || !record.expiresAt || record.expiresAt < new Date()) {
    throw new ApiError(400, 'Verification code expired')
  }
  if (record.attempts >= 5) throw new ApiError(429, 'Too many attempts')

  const incomingHash = crypto.createHash('sha256').update(String(code || '')).digest('hex')
  if (incomingHash !== record.codeHash) {
    user.emailVerification.attempts = (user.emailVerification.attempts || 0) + 1
    await user.save()
    throw new ApiError(400, 'Invalid verification code')
  }

  user.emailVerified = true
  user.emailVerification = undefined
  await user.save()

  const token = signJwt({ sub: user._id, email: user.email, roles: user.roles })
  res.cookie('access_token', token, accessCookie)
  res.json({ ok: true, user: sanitize(user) })
})

/* ---------- VERIFY EMAIL ON LOGIN ---------- */
export const verifyEmailOnLogin = catchAsync(async (req, res) => {
  const { tmpToken, code, remember } = req.body
  let payload
  try { payload = verifyJwt(tmpToken) } catch { throw new ApiError(400, 'Invalid or expired login token') }
  if (payload.kind !== 'email_login') throw new ApiError(400, 'Invalid login token')

  const user = await User.findById(payload.sub)
  if (!user) throw new ApiError(400, 'User not found')

  const record = user.loginOTP || {}
  if (!record.codeHash || !record.expiresAt || record.expiresAt < new Date()) {
    throw new ApiError(400, 'Verification code expired')
  }
  if (record.attempts >= 5) throw new ApiError(429, 'Too many attempts')

  const incomingHash = crypto.createHash('sha256').update(String(code || '')).digest('hex')
  if (incomingHash !== record.codeHash) {
    user.loginOTP.attempts = (user.loginOTP.attempts || 0) + 1
    await user.save()
    throw new ApiError(400, 'Invalid verification code')
  }

  user.loginOTP = undefined
  await user.save()

  // If user chose to remember this device for 30 days, set a remember cookie
  if (remember) {
    const rem = signJwt({ kind: '2fa_remember', sub: user._id }, { expiresIn: '30d' })
    res.cookie('twofa_remember', rem, remember2faCookie)
  }

  // Complete login after successful email verification (no further 2FA required for this attempt)
  const token = signJwt({ sub: user._id, email: user.email, roles: user.roles })
  res.cookie('access_token', token, accessCookie)
  res.json({ ok: true, user: sanitize(user) })
})
