/**
 * State Management Utility for Orders and Payments
 * Ensures consistent state transitions and proper validation
 */

// Define all possible states
export const ORDER_STATES = {
  CREATED: 'CREATED',
  CONFIRMED: 'CONFIRMED',
  PACKING: 'PACKING',
  SHIPPED: 'SHIPPED',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  RETURN_REQUESTED: 'RETURN_REQUESTED',
  RETURNED: 'RETURNED'
}

export const DELIVERY_STATES = {
  NOT_DISPATCHED: 'NOT_DISPATCHED',
  SHIPPED: 'SHIPPED',
  IN_TRANSIT: 'IN_TRANSIT',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  DELIVERY_FAILED: 'DELIVERY_FAILED',
  RTO_INITIATED: 'RTO_INITIATED',
  RETURNED_TO_WAREHOUSE: 'RETURNED_TO_WAREHOUSE'
}

export const PAYMENT_STATES = {
  UNPAID: 'UNPAID',
  PENDING: 'PENDING',
  AUTHORIZED: 'AUTHORIZED',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REFUND_PENDING: 'REFUND_PENDING',
  REFUNDED: 'REFUNDED'
}

export const PAYMENT_METHODS = {
  COD: 'COD',
  CARD: 'CARD',
  BANK: 'BANK'
}

// State transition rules
const ORDER_STATE_TRANSITIONS = {
  [ORDER_STATES.CREATED]: [ORDER_STATES.CONFIRMED, ORDER_STATES.CANCELLED],
  [ORDER_STATES.CONFIRMED]: [ORDER_STATES.PACKING, ORDER_STATES.CANCELLED],
  [ORDER_STATES.PACKING]: [ORDER_STATES.SHIPPED, ORDER_STATES.CANCELLED],
  [ORDER_STATES.SHIPPED]: [ORDER_STATES.OUT_FOR_DELIVERY, ORDER_STATES.CANCELLED],
  [ORDER_STATES.OUT_FOR_DELIVERY]: [ORDER_STATES.DELIVERED, ORDER_STATES.CANCELLED],
  [ORDER_STATES.DELIVERED]: [ORDER_STATES.RETURN_REQUESTED],
  [ORDER_STATES.RETURN_REQUESTED]: [ORDER_STATES.RETURNED],
  [ORDER_STATES.CANCELLED]: [],
  [ORDER_STATES.RETURNED]: []
}

const DELIVERY_STATE_TRANSITIONS = {
  [DELIVERY_STATES.NOT_DISPATCHED]: [DELIVERY_STATES.SHIPPED],
  [DELIVERY_STATES.SHIPPED]: [DELIVERY_STATES.IN_TRANSIT, DELIVERY_STATES.OUT_FOR_DELIVERY, DELIVERY_STATES.DELIVERY_FAILED, DELIVERY_STATES.RTO_INITIATED],
  [DELIVERY_STATES.IN_TRANSIT]: [DELIVERY_STATES.OUT_FOR_DELIVERY, DELIVERY_STATES.DELIVERY_FAILED, DELIVERY_STATES.RTO_INITIATED],
  [DELIVERY_STATES.OUT_FOR_DELIVERY]: [DELIVERY_STATES.DELIVERED, DELIVERY_STATES.DELIVERY_FAILED, DELIVERY_STATES.RTO_INITIATED],
  [DELIVERY_STATES.DELIVERY_FAILED]: [DELIVERY_STATES.RTO_INITIATED, DELIVERY_STATES.OUT_FOR_DELIVERY],
  [DELIVERY_STATES.RTO_INITIATED]: [DELIVERY_STATES.RETURNED_TO_WAREHOUSE],
  [DELIVERY_STATES.RETURNED_TO_WAREHOUSE]: [],
  [DELIVERY_STATES.DELIVERED]: []
}

const PAYMENT_STATE_TRANSITIONS = {
  [PAYMENT_STATES.UNPAID]: [PAYMENT_STATES.PENDING, PAYMENT_STATES.AUTHORIZED, PAYMENT_STATES.PAID, PAYMENT_STATES.FAILED, PAYMENT_STATES.REFUND_PENDING, PAYMENT_STATES.REFUNDED],
  [PAYMENT_STATES.PENDING]: [PAYMENT_STATES.AUTHORIZED, PAYMENT_STATES.PAID, PAYMENT_STATES.FAILED],
  [PAYMENT_STATES.AUTHORIZED]: [PAYMENT_STATES.PAID, PAYMENT_STATES.FAILED],
  [PAYMENT_STATES.PAID]: [PAYMENT_STATES.REFUND_PENDING, PAYMENT_STATES.REFUNDED],
  [PAYMENT_STATES.REFUND_PENDING]: [PAYMENT_STATES.REFUNDED],
  [PAYMENT_STATES.FAILED]: [],
  [PAYMENT_STATES.REFUNDED]: []
}

/**
 * Get initial states for a new order based on payment method
 */
export function getInitialStates(paymentMethod) {
  let orderState = ORDER_STATES.CONFIRMED
  let deliveryState = DELIVERY_STATES.NOT_DISPATCHED
  let paymentStatus
  let legacyStatus

  switch (paymentMethod) {
    case PAYMENT_METHODS.CARD:
      paymentStatus = PAYMENT_STATES.PENDING // awaiting authorization/capture
      legacyStatus = 'pending_payment'
      break
    case PAYMENT_METHODS.BANK:
      paymentStatus = PAYMENT_STATES.PENDING // awaiting slip verification
      legacyStatus = 'placed'
      break
    case PAYMENT_METHODS.COD:
      paymentStatus = PAYMENT_STATES.UNPAID
      legacyStatus = 'placed'
      break
    default:
      throw new Error(`Invalid payment method: ${paymentMethod}`)
  }

  return { orderState, deliveryState, paymentStatus, legacyStatus }
}

/**
 * Validate state transition
 */
export function canTransitionOrderState(currentState, newState) {
  if (!ORDER_STATE_TRANSITIONS[currentState]) return false
  return ORDER_STATE_TRANSITIONS[currentState].includes(newState)
}

export function canTransitionDeliveryState(currentState, newState) {
  if (!DELIVERY_STATE_TRANSITIONS[currentState]) return false
  return DELIVERY_STATE_TRANSITIONS[currentState].includes(newState)
}

export function canTransitionPaymentState(currentState, newState) {
  if (!PAYMENT_STATE_TRANSITIONS[currentState]) return false
  return PAYMENT_STATE_TRANSITIONS[currentState].includes(newState)
}

/**
 * Validate dispatch requirements
 */
export function validateDispatchRequirements(order) {
  const method = order.payment?.method
  const paymentStatus = order.payment?.status

  if (method === PAYMENT_METHODS.COD) {
    return [PAYMENT_STATES.UNPAID, PAYMENT_STATES.PAID].includes(paymentStatus)
  } else if (method === PAYMENT_METHODS.CARD) {
    return [PAYMENT_STATES.PAID, PAYMENT_STATES.AUTHORIZED].includes(paymentStatus)
  } else if (method === PAYMENT_METHODS.BANK) {
    return paymentStatus === PAYMENT_STATES.PAID
  }
  return false
}

/**
 * Check if order should be auto-closed
 */
export function shouldAutoClose(deliveryState, paymentStatus) {
  const completedDelivery = [DELIVERY_STATES.DELIVERED, DELIVERY_STATES.RETURNED_TO_WAREHOUSE].includes(deliveryState)
  const completedPayment = [PAYMENT_STATES.PAID, PAYMENT_STATES.REFUNDED].includes(paymentStatus)
  return completedDelivery && completedPayment
}

/**
 * Update order states with proper validation
 */
export function updateOrderStates(order, updates) {
  const changes = {}

  // Validate and update order state
  if (updates.orderState && updates.orderState !== order.orderState) {
    if (!canTransitionOrderState(order.orderState, updates.orderState)) {
      throw new Error(`Invalid order state transition from ${order.orderState} to ${updates.orderState}`)
    }
    changes.orderState = updates.orderState
  }

  // Validate and update delivery state
  if (updates.deliveryState && updates.deliveryState !== order.deliveryState) {
    if (!canTransitionDeliveryState(order.deliveryState, updates.deliveryState)) {
      throw new Error(`Invalid delivery state transition from ${order.deliveryState} to ${updates.deliveryState}`)
    }
    changes.deliveryState = updates.deliveryState
  }

  // Validate and update payment status
  if (updates.paymentStatus && updates.paymentStatus !== order.payment?.status) {
    if (!canTransitionPaymentState(order.payment?.status, updates.paymentStatus)) {
      throw new Error(`Invalid payment state transition from ${order.payment?.status} to ${updates.paymentStatus}`)
    }
    changes.paymentStatus = updates.paymentStatus
  }

// Validate dispatch if transitioning to SHIPPED
  if (changes.deliveryState === DELIVERY_STATES.SHIPPED) {
    const tempOrder = { ...order, payment: { ...order.payment, status: changes.paymentStatus || order.payment?.status } }
    if (!validateDispatchRequirements(tempOrder)) {
      throw new Error('Order does not meet dispatch requirements')
    }
    // If CARD and AUTHORIZED, capture on ship
    if (tempOrder.payment?.method === PAYMENT_METHODS.CARD && (changes.paymentStatus || order.payment?.status) === PAYMENT_STATES.AUTHORIZED) {
      changes.paymentStatus = PAYMENT_STATES.PAID
    }
  }

  // Auto-close if conditions are met
  const finalDeliveryState = changes.deliveryState || order.deliveryState
  const finalPaymentStatus = changes.paymentStatus || order.payment?.status
  
  if (shouldAutoClose(finalDeliveryState, finalPaymentStatus)) {
    // We intentionally do not change orderState to a non-enumerated CLOSED state.
    // Keep the orderState as DELIVERED or RETURNED; legacy status will be updated by applyStateChanges.
  }

  return changes
}

/**
 * Admin convenience: compute state changes for three-phase workflow
 * phase: 'placed' | 'packed' | 'dispatched'
 * Does not write evidence itself. Enforces dispatch payment guards.
 */
export function getAdminPhaseChanges(order, phase) {
  const p = String(phase).toLowerCase()
  const out = {}
  if (p === 'placed') {
    out.orderState = ORDER_STATES.CONFIRMED
    out.deliveryState = DELIVERY_STATES.NOT_DISPATCHED
    return out
  }
  if (p === 'packed') {
    out.orderState = ORDER_STATES.PACKING
    out.deliveryState = DELIVERY_STATES.NOT_DISPATCHED
    return out
  }
  if (p === 'dispatched') {
    // Validate payment guard
    if (!validateDispatchRequirements(order)) {
      throw new Error('Order does not meet dispatch requirements')
    }
    out.orderState = ORDER_STATES.SHIPPED
    out.deliveryState = DELIVERY_STATES.SHIPPED
    // Auto-capture on ship if CARD is AUTHORIZED
    const method = order.payment?.method
    const pay = order.payment?.status
    if (method === PAYMENT_METHODS.CARD && pay === PAYMENT_STATES.AUTHORIZED) {
      out.paymentStatus = PAYMENT_STATES.PAID
    }
    return out
  }
  throw new Error('Unsupported phase')
}

/**
 * Get legacy status for backward compatibility
 */
export function getLegacyStatus(orderState, deliveryState, paymentMethod, paymentStatus) {
  if (orderState === ORDER_STATES.CANCELLED) return 'CANCELLED'
  if (orderState === ORDER_STATES.RETURNED) return 'RETURNED'

  // If not dispatched and payment is successful for online methods, surface as "placed"
  if (deliveryState === DELIVERY_STATES.NOT_DISPATCHED) {
    const pm = String(paymentMethod || '')
    const ps = String(paymentStatus || '')
    if ((pm === PAYMENT_METHODS.CARD || pm === PAYMENT_METHODS.BANK) && ps === PAYMENT_STATES.PAID) {
      return 'placed'
    }
  }

  // If shipped/out, prefer delivery state for summary
  switch (deliveryState) {
    case DELIVERY_STATES.NOT_DISPATCHED:
      return orderState
    case DELIVERY_STATES.SHIPPED:
    case DELIVERY_STATES.IN_TRANSIT:
      return 'SHIPPED'
    case DELIVERY_STATES.OUT_FOR_DELIVERY:
      return 'OUT_FOR_DELIVERY'
    case DELIVERY_STATES.DELIVERED:
      return 'DELIVERED'
    case DELIVERY_STATES.DELIVERY_FAILED:
      return 'DELIVERY_FAILED'
    case DELIVERY_STATES.RTO_INITIATED:
      return 'RTO_INITIATED'
    case DELIVERY_STATES.RETURNED_TO_WAREHOUSE:
      return 'RETURNED_TO_WAREHOUSE'
    default:
      return orderState || 'CREATED'
  }
}

/**
 * Apply state changes to order object
 */
export function applyStateChanges(order, changes) {
  if (changes.orderState) order.orderState = changes.orderState
  if (changes.deliveryState) order.deliveryState = changes.deliveryState
  if (changes.paymentStatus) {
    order.payment = order.payment || {}
    order.payment.status = changes.paymentStatus
  }

  // Update legacy status for backward compatibility
  order.status = getLegacyStatus(
    order.orderState,
    order.deliveryState,
    order.payment?.method,
    order.payment?.status
  )

  // Update status history
  const newStatus = changes.deliveryState || changes.orderState || order.status
  if (newStatus && newStatus !== order.statusHistory?.[order.statusHistory.length - 1]?.status) {
    order.statusHistory = (order.statusHistory || []).concat([{ 
      status: newStatus, 
      at: new Date() 
    }])
  }
}