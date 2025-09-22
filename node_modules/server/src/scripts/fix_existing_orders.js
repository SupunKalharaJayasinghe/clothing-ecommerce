import 'dotenv/config'
import mongoose from 'mongoose'
import Order from '../api/models/Order.js'
import { getInitialStates, getLegacyStatus } from '../utils/stateManager.js'
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

    // Fix COD orders with wrong payment status
    if (order.payment?.method === 'COD' && order.payment?.status === 'pending') {
      updates['payment.status'] = 'cod_pending'
      needsUpdate = true
      console.log(`🔄 COD Order ${order._id}: pending → cod_pending`)
    }

    // Fix CARD orders with wrong payment status (if they're not initiated/paid)
    if (order.payment?.method === 'CARD' && 
        !['initiated', 'paid', 'authorized', 'failed', 'cancelled'].includes(order.payment?.status)) {
      updates['payment.status'] = 'initiated'
      needsUpdate = true
      console.log(`🔄 CARD Order ${order._id}: ${order.payment?.status} → initiated`)
    }

    // Fix BANK orders with wrong payment status
    if (order.payment?.method === 'BANK' && 
        order.payment?.status === 'pending' && 
        !order.payment?.bank?.verifiedAt) {
      updates['payment.status'] = 'pending_verification'
      needsUpdate = true
      console.log(`🔄 BANK Order ${order._id}: pending → pending_verification`)
    }

    // Fix legacy status if needed
    if (order.orderState && order.deliveryState && order.payment) {
      const correctLegacyStatus = getLegacyStatus(
        order.orderState,
        order.deliveryState,
        order.payment.method,
        updates['payment.status'] || order.payment.status
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