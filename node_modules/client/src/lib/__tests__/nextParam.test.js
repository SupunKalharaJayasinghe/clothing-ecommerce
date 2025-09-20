import { describe, it, expect } from 'vitest'
import { getNextFromSearch, sanitizeNextPath, getLoginPathWithNext, getRegisterPathWithNext } from '../nextParam'

// Helper to build search strings
function s(q) { return q ? `?${q}` : '' }

describe('nextParam util', () => {
  describe('getNextFromSearch', () => {
    it('returns path for normal case', () => {
      expect(getNextFromSearch(s('next=/orders'))).toBe('/orders')
    })
    it('returns / when missing', () => {
      expect(getNextFromSearch(s('foo=bar'))).toBe('/')
    })
    it('returns / for unsafe external URL', () => {
      expect(getNextFromSearch(s('next=http://evil.com'))).toBe('/')
    })
    it('returns / for login/register loops', () => {
      expect(getNextFromSearch(s('next=/login'))).toBe('/')
      expect(getNextFromSearch(s('next=/register'))).toBe('/')
    })
  })

  describe('sanitizeNextPath', () => {
    it('accepts safe path', () => {
      expect(sanitizeNextPath('/orders')).toBe('/orders')
    })
    it('fallbacks to / on empty/invalid', () => {
      expect(sanitizeNextPath('')).toBe('/')
      expect(sanitizeNextPath('http://evil.com')).toBe('/')
      expect(sanitizeNextPath('orders')).toBe('/')
    })
    it('prevents loops to auth routes', () => {
      expect(sanitizeNextPath('/login')).toBe('/')
      expect(sanitizeNextPath('/register')).toBe('/')
    })
  })

  describe('getLoginPathWithNext / getRegisterPathWithNext', () => {
    it('root maps to plain /login or /register', () => {
      expect(getLoginPathWithNext('/')).toBe('/login')
      expect(getRegisterPathWithNext('/')).toBe('/register')
    })
    it('appends encoded next for non-root', () => {
      const p = '/checkout?x=1'
      const encoded = encodeURIComponent(p)
      expect(getLoginPathWithNext(p)).toBe(`/login?next=${encoded}`)
      expect(getRegisterPathWithNext(p)).toBe(`/register?next=${encoded}`)
    })
  })
})
