import test from 'node:test'
import assert from 'node:assert/strict'
import { paymentStatusClass, refundStatusClass, returnStatusClass } from '../src/utils/status.js'

// Payments mapping tests
const GREEN = 'text-green-400'
const YELLOW = 'text-yellow-400'
const RED = 'text-red-400'
const MUTED = 'text-[color:var(--text-muted)]'

test('paymentStatusClass maps PAID/REFUNDED to green', () => {
  assert.match(paymentStatusClass('PAID'), new RegExp(GREEN))
  assert.match(paymentStatusClass('REFUNDED'), new RegExp(GREEN))
})

test('paymentStatusClass maps PENDING/REFUND_PENDING/AUTHORIZED to yellow', () => {
  for (const s of ['PENDING','REFUND_PENDING','AUTHORIZED']) {
    assert.match(paymentStatusClass(s), new RegExp(YELLOW))
  }
})

test('paymentStatusClass maps FAILED to red', () => {
  assert.match(paymentStatusClass('FAILED'), new RegExp(RED))
})

// Refunds mapping tests

test('refundStatusClass maps PROCESSED to green', () => {
  assert.match(refundStatusClass('PROCESSED'), new RegExp(GREEN))
})

test('refundStatusClass maps REQUESTED to yellow', () => {
  assert.match(refundStatusClass('REQUESTED'), new RegExp(YELLOW))
})

test('refundStatusClass maps APPROVED/PROCESSING to blue class presence', () => {
  const cls = refundStatusClass('APPROVED')
  assert.equal(/text-blue-400/.test(cls), true)
})

test('refundStatusClass maps FAILED/CANCELLED to red', () => {
  assert.match(refundStatusClass('FAILED'), new RegExp(RED))
  assert.match(refundStatusClass('CANCELLED'), new RegExp(RED))
})

// Returns mapping tests (lowercase)

test('returnStatusClass maps approved/received/closed to green', () => {
  for (const s of ['approved','received','closed']) {
    assert.match(returnStatusClass(s), new RegExp(GREEN))
  }
})

test('returnStatusClass maps requested to blue', () => {
  const cls = returnStatusClass('requested')
  assert.equal(/text-blue-400/.test(cls), true)
})

test('returnStatusClass maps rejected to red', () => {
  assert.match(returnStatusClass('rejected'), new RegExp(RED))
})

// Fallbacks

test('unknown values return muted class', () => {
  assert.ok(paymentStatusClass('WHATEVER').includes(MUTED))
  assert.ok(refundStatusClass('WHATEVER').includes(MUTED))
  assert.ok(returnStatusClass('WHATEVER').includes(MUTED))
})
