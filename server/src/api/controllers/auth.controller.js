import bcrypt from 'bcryptjs'
import User from '../models/User.js'
import ApiError from '../../utils/ApiError.js'
import catchAsync from '../../utils/catchAsync.js'
import { signJwt } from '../../utils/jwt.js'

const cookieOpts = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
}

export const register = catchAsync(async (req, res) => {
  const { name, email, password } = req.body
  if (!name || !email || !password) throw new ApiError(400, 'name, email, password are required')
  if (password.length < 8) throw new ApiError(400, 'password must be at least 8 characters')

  const exists = await User.findOne({ email })
  if (exists) throw new ApiError(409, 'Email already in use')

  const hash = await bcrypt.hash(password, 12)
  const user = await User.create({ name, email, password: hash })

  const token = signJwt({ sub: user._id, email: user.email, roles: user.roles })
  res.cookie('access_token', token, cookieOpts)
  res.status(201).json({ ok: true, user: { id: user._id, name: user.name, email: user.email, roles: user.roles } })
})

export const login = catchAsync(async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) throw new ApiError(400, 'email and password are required')

  const user = await User.findOne({ email }).select('+password')
  if (!user) throw new ApiError(401, 'Invalid credentials')

  const match = await bcrypt.compare(password, user.password)
  if (!match) throw new ApiError(401, 'Invalid credentials')

  const token = signJwt({ sub: user._id, email: user.email, roles: user.roles })
  res.cookie('access_token', token, cookieOpts)
  res.json({ ok: true, user: { id: user._id, name: user.name, email: user.email, roles: user.roles } })
})

export const me = catchAsync(async (req, res) => {
  const user = await User.findById(req.user.sub)
  res.json({ ok: true, user: { id: user._id, name: user.name, email: user.email, roles: user.roles } })
})

export const logout = catchAsync(async (_req, res) => {
  res.clearCookie('access_token', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' })
  res.json({ ok: true })
})
