import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

export function signJwt(payload, options = {}) {
  return jwt.sign(payload, env.JWT_SECRET || 'dev-secret', {
    expiresIn: env.JWT_EXPIRES_IN || '7d',
    ...options
  })
}
export function verifyJwt(token) {
  return jwt.verify(token, env.JWT_SECRET || 'dev-secret')
}
