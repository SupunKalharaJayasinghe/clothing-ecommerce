import 'dotenv/config'
import mongoose from 'mongoose'
import Order from '../api/models/Order.js'
import { getLegacyStatus, PAYMENT_STATES } from '../utils/stateManager.js'
import { env } from '../config/env.js'
import { connectDB } from '../config/db.js'

console.log('🔧 Fixing existing orders with incorrect payment states...\n')

// Connect to MongoDB
if (!env.MONGO_URI) {
  console.error('❌ MONGO_URI not found in environment variables')
  process.exit(1)
}

try {
  await connectDB(env.MONGO_URI)
} catch (error) {
  console.error('❌ MongoDB connection failed:', error.message)
  process.exit(1)
}

let fixedCount = 0
let totalCount = 0

try {
  // Find all orders that need fixing
  const orders = await Order.find({}).limit(1000) // Process in batches
  totalCount = orders.length
  console.log(`📊 Found ${totalCount} orders to check\n`)

  for (const order of orders) {
    let needsUpdate = false
    const updates = {}

    const method = String(order.payment?.method || '').toUpperCase()
    const statusRaw = String(order.payment?.status || '').toUpperCase()
    const mapLegacyToEnum = (m, s) => {
      if (m === 'COD') {
        // Valid: UNPAID | PAID | FAILED
        if (s === 'PAID' || s === 'UNPAID' || s === 'FAILED') return s
        if (s === 'PENDING' || s === 'COD_PENDING') return 'UNPAID'
        return 'UNPAID'
      }
      if (m === 'CARD') {
        // Valid: PENDING | AUTHORIZED | PAID | FAILED | REFUND_PENDING | REFUNDED
        if (['PENDING','AUTHORIZED','PAID','FAILED','REFUND_PENDING','REFUNDED'].includes(s)) return s
        if (s === 'INITIATED') return 'PENDING'
        if (s === 'CANCELLED') return 'FAILED'
        return 'PENDING'
      }
      if (m === 'BANK') {
        if (['PENDING','PAID','FAILED','REFUND_PENDING','REFUNDED'].includes(s)) return s
        if (s === 'PENDING_VERIFICATION' || s === 'INITIATED' || s === 'PENDING') return 'PENDING'
        return 'PENDING'
      }
      return s || 'UNPAID'
    }

    // Determine normalized status
    const normalized = mapLegacyToEnum(method, statusRaw)
    if (normalized && normalized !== statusRaw) {
      updates['payment.status'] = normalized
      needsUpdate = true
      console.log(`🔄 Order ${order._id}: payment.status ${statusRaw || '(empty)'} → ${normalized}`)
    }

    // If bank and a verifiedAt exists, ensure status is PAID
    if (method === 'BANK' && order.payment?.bank?.verifiedAt) {
      if (normalized !== PAYMENT_STATES.PAID) {
        updates['payment.status'] = PAYMENT_STATES.PAID
        needsUpdate = true
        console.log(`🔄 bank Order ${order._id}: verified → PAID`)
      }
    }

    // Fix legacy status if needed
    if (order.orderState && order.deliveryState && order.payment) {
      const finalPay = updates['payment.status'] || order.payment.status
      const correctLegacyStatus = getLegacyStatus(
        order.orderState,
        order.deliveryState,
        order.payment.method,
        finalPay
      )
      
      if (order.status !== correctLegacyStatus) {
        updates.status = correctLegacyStatus
        needsUpdate = true
        console.log(`🔄 Order ${order._id}: status ${order.status} → ${correctLegacyStatus}`)
      }
    }

    // Apply updates if needed
    if (needsUpdate) {
      await Order.updateOne({ _id: order._id }, { $set: updates })
      fixedCount++
    }
  }

  console.log(`\n✅ Migration completed!`)
  console.log(`📊 Total orders checked: ${totalCount}`)
  console.log(`🔧 Orders fixed: ${fixedCount}`)
  console.log(`✨ Orders already correct: ${totalCount - fixedCount}`)
} catch (error) {
  console.error('❌ Migration failed:', error)
} finally {
  await mongoose.disconnect()
  console.log('\n👋 Disconnected from MongoDB')
}