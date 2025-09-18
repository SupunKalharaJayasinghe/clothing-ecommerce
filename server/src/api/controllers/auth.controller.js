import bcrypt from 'bcryptjs'
import User from '../models/User.js'
import ApiError from '../../utils/ApiError.js'
import catchAsync from '../../utils/catchAsync.js'
import { signJwt } from '../../utils/jwt.js'

const cookieOpts = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000
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

export const register = catchAsync(async (req, res) => {
  const { firstName, lastName, username, email, password } = req.body

  // Ensure uniqueness
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
    username,
    email,
    password: hash
  })

  const token = signJwt({ sub: user._id, email: user.email, roles: user.roles })
  res.cookie('access_token', token, cookieOpts)
  res.status(201).json({ ok: true, user: sanitize(user) })
})

export const login = catchAsync(async (req, res) => {
  const { identifier, password } = req.body
  const idLower = identifier.toLowerCase()

  const user = await User.findOne({
    $or: [{ email: idLower }, { username: idLower }]
  }).select('+password')

  if (!user) throw new ApiError(401, 'Invalid credentials')

  const match = await bcrypt.compare(password, user.password)
  if (!match) throw new ApiError(401, 'Invalid credentials')

  const token = signJwt({ sub: user._id, email: user.email, roles: user.roles })
  res.cookie('access_token', token, cookieOpts)
  res.json({ ok: true, user: sanitize(user) })
})

export const me = catchAsync(async (req, res) => {
  const user = await User.findById(req.user.sub)
  res.json({ ok: true, user: sanitize(user) })
})

export const logout = catchAsync(async (_req, res) => {
  res.clearCookie('access_token', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' })
  res.json({ ok: true })
})
