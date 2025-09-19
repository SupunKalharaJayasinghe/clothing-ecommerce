import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

export function signJwt(payload, options = {}) {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
    ...options
  })
}
export function verifyJwt(token) {
  return jwt.verify(token, env.JWT_SECRET)
}
