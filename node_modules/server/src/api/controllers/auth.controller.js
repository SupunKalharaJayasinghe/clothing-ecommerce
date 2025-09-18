import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import User from '../models/User.js'
import ApiError from '../../utils/ApiError.js'
import catchAsync from '../../utils/catchAsync.js'
import { signJwt, verifyJwt } from '../../utils/jwt.js'
import { authenticator } from 'otplib'

const accessCookie = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000
}
const remember2faCookie = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
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
  const user = await User.create({ firstName, lastName, username, email, password: hash })

  const token = signJwt({ sub: user._id, email: user.email, roles: user.roles })
  res.cookie('access_token', token, accessCookie)
  res.status(201).json({ ok: true, user: sanitize(user) })
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

  // If 2FA enabled, check remember cookie; otherwise issue challenge
  if (user.twoFA?.enabled) {
    const rememberToken = req.cookies?.twofa_remember
    if (rememberToken) {
      try {
        const payload = verifyJwt(rememberToken)
        if (payload.kind === '2fa_remember' && String(payload.sub) === String(user._id)) {
          // allow login without new TOTP
          const token = signJwt({ sub: user._id, email: user.email, roles: user.roles })
          res.cookie('access_token', token, accessCookie)
          return res.json({ ok: true, user: sanitize(user) })
        }
      } catch { /* invalid remember cookie -> fall through to challenge */ }
    }

    // issue short-lived tmp token for TOTP verification
    const tmpToken = signJwt({ kind: '2fa', sub: user._id }, { expiresIn: '5m' })
    return res.json({ ok: true, twoFARequired: true, tmpToken })
  }

  // No 2FA
  const token = signJwt({ sub: user._id, email: user.email, roles: user.roles })
  res.cookie('access_token', token, accessCookie)
  res.json({ ok: true, user: sanitize(user) })
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

  // If used a backup code, remove it (one-time use)
  if (isBackup) {
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

/* ---------- ME / LOGOUT ---------- */
export const me = catchAsync(async (req, res) => {
  const user = await User.findById(req.user.sub)
  res.json({ ok: true, user: sanitize(user) })
})

export const logout = catchAsync(async (_req, res) => {
  res.clearCookie('access_token', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' })
  res.clearCookie('twofa_remember', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' })
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
