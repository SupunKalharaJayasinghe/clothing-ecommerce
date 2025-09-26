import { 
  getInitialStates, 
  updateOrderStates, 
  applyStateChanges,
  validateDispatchRequirements,
  shouldAutoClose,
  PAYMENT_METHODS,
  PAYMENT_STATES,
  ORDER_STATES,
  DELIVERY_STATES 
} from '../utils/stateManager.js'

console.log('🧪 Testing State Management Logic...\n')

// Test 1: Initial states for different payment methods
console.log('1️⃣ Testing Initial States:')
console.log('COD Order:', getInitialStates(PAYMENT_METHODS.COD))
console.log('CARD Order:', getInitialStates(PAYMENT_METHODS.CARD))
console.log('BANK Order:', getInitialStates(PAYMENT_METHODS.BANK))
console.log('')

// Test 2: State transitions
console.log('2️⃣ Testing State Transitions:')

// Mock order for COD
const codOrder = {
  orderState: ORDER_STATES.PLACED,
  deliveryState: DELIVERY_STATES.NOT_STARTED,
  payment: {
    method: PAYMENT_METHODS.COD,
    status: PAYMENT_STATES.COD_PENDING
  },
  statusHistory: []
}

try {
  console.log('✅ COD Order Initial State:', codOrder)
  
  // Update to confirmed
  let changes = updateOrderStates(codOrder, { deliveryState: DELIVERY_STATES.CONFIRMED })
  applyStateChanges(codOrder, changes)
  console.log('✅ After confirming delivery:', { orderState: codOrder.orderState, deliveryState: codOrder.deliveryState, status: codOrder.status })
  
  // Update to dispatched (should work for COD with cod_pending)
  changes = updateOrderStates(codOrder, { deliveryState: DELIVERY_STATES.DISPATCHED })
  applyStateChanges(codOrder, changes)
  console.log('✅ After dispatch:', { orderState: codOrder.orderState, deliveryState: codOrder.deliveryState, status: codOrder.status })
  
  // Collect COD payment
  changes = updateOrderStates(codOrder, { paymentStatus: PAYMENT_STATES.COD_COLLECTED })
  applyStateChanges(codOrder, changes)
  console.log('✅ After COD collection:', { orderState: codOrder.orderState, deliveryState: codOrder.deliveryState, paymentStatus: codOrder.payment.status, status: codOrder.status })
  
  // Deliver order (should auto-close)
  changes = updateOrderStates(codOrder, { deliveryState: DELIVERY_STATES.DELIVERED })
  applyStateChanges(codOrder, changes)
  console.log('✅ After delivery (auto-closed):', { orderState: codOrder.orderState, deliveryState: codOrder.deliveryState, paymentStatus: codOrder.payment.status, status: codOrder.status })
  
} catch (error) {
  console.log('❌ COD Test Failed:', error.message)
}

console.log('')

// Test 3: CARD order flow
console.log('3️⃣ Testing CARD Order Flow:')

const cardOrder = {
  orderState: ORDER_STATES.PLACED,
  deliveryState: DELIVERY_STATES.NOT_STARTED,
  payment: {
    method: PAYMENT_METHODS.CARD,
    status: PAYMENT_STATES.INITIATED
  },
  statusHistory: []
}

try {
  console.log('✅ CARD Order Initial State:', cardOrder)
  
  // Try to dispatch before payment (should fail)
  try {
    updateOrderStates(cardOrder, { deliveryState: DELIVERY_STATES.DISPATCHED })
    console.log('❌ Dispatch validation failed - should not allow dispatch without payment')
  } catch (error) {
    console.log('✅ Dispatch validation works:', error.message)
  }
  
  // Pay first
  let changes = updateOrderStates(cardOrder, { paymentStatus: PAYMENT_STATES.PAID })
  applyStateChanges(cardOrder, changes)
  console.log('✅ After payment:', { orderState: cardOrder.orderState, deliveryState: cardOrder.deliveryState, paymentStatus: cardOrder.payment.status, status: cardOrder.status })
  
  // Now dispatch should work
  changes = updateOrderStates(cardOrder, { deliveryState: DELIVERY_STATES.DISPATCHED })
  applyStateChanges(cardOrder, changes)
  console.log('✅ After dispatch:', { orderState: cardOrder.orderState, deliveryState: cardOrder.deliveryState, paymentStatus: cardOrder.payment.status, status: cardOrder.status })
  
} catch (error) {
  console.log('❌ CARD Test Failed:', error.message)
}

console.log('')

// Test 4: Invalid transitions
console.log('4️⃣ Testing Invalid Transitions:')

const testOrder = {
  orderState: ORDER_STATES.PLACED,
  deliveryState: DELIVERY_STATES.DELIVERED, // Already delivered
  payment: { status: PAYMENT_STATES.PAID },
  statusHistory: []
}

try {
  updateOrderStates(testOrder, { deliveryState: DELIVERY_STATES.PACKED })
  console.log('❌ Invalid transition validation failed')
} catch (error) {
  console.log('✅ Invalid transition blocked:', error.message)
}

console.log('')

// Test 5: Auto-close conditions
console.log('5️⃣ Testing Auto-Close Conditions:')
console.log('Should auto-close (delivered + paid):', shouldAutoClose(DELIVERY_STATES.DELIVERED, PAYMENT_STATES.PAID))
console.log('Should auto-close (delivered + cod_collected):', shouldAutoClose(DELIVERY_STATES.DELIVERED, PAYMENT_STATES.COD_COLLECTED))
console.log('Should auto-close (returned + refunded):', shouldAutoClose(DELIVERY_STATES.RETURNED, PAYMENT_STATES.REFUNDED))
console.log('Should NOT auto-close (delivered + pending):', shouldAutoClose(DELIVERY_STATES.DELIVERED, PAYMENT_STATES.PENDING))

console.log('')

// Test 6: Dispatch validation
console.log('6️⃣ Testing Dispatch Validation:')

const codOrderForDispatch = { payment: { method: PAYMENT_METHODS.COD, status: PAYMENT_STATES.COD_PENDING } }
const cardOrderForDispatch = { payment: { method: PAYMENT_METHODS.CARD, status: PAYMENT_STATES.PAID } }
const bankOrderForDispatch = { payment: { method: PAYMENT_METHODS.BANK, status: PAYMENT_STATES.PAID } }
const unpaidCardOrder = { payment: { method: PAYMENT_METHODS.CARD, status: PAYMENT_STATES.INITIATED } }

console.log('COD with cod_pending can dispatch:', validateDispatchRequirements(codOrderForDispatch))
console.log('CARD with paid can dispatch:', validateDispatchRequirements(cardOrderForDispatch))
console.log('BANK with paid can dispatch:', validateDispatchRequirements(bankOrderForDispatch))
console.log('CARD with initiated cannot dispatch:', validateDispatchRequirements(unpaidCardOrder))

console.log('')
console.log('✅ All State Management Tests Completed!')