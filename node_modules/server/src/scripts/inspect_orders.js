import 'dotenv/config'
import mongoose from 'mongoose'
import Order from '../api/models/Order.js'
import { env } from '../config/env.js'
import { connectDB } from '../config/db.js'

console.log('🔍 Inspecting current order states...\n')

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

try {
  // Get a sample of orders
  const orders = await Order.find({}).limit(10).lean()
  console.log(`📊 Found ${orders.length} orders to inspect\n`)

  for (const order of orders) {
    console.log(`Order ID: ${order._id}`)
    console.log(`  Payment Method: ${order.payment?.method}`)
    console.log(`  Payment Status: ${order.payment?.status}`)
    console.log(`  Order State: ${order.orderState}`)
    console.log(`  Delivery State: ${order.deliveryState}`)
    console.log(`  Legacy Status: ${order.status}`)
    console.log(`  Created: ${order.createdAt}`)
    console.log('---')
  }

  // Get counts by payment method and status
  const pipeline = [
    {
      $group: {
        _id: {
          method: '$payment.method',
          status: '$payment.status'
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.method': 1, '_id.status': 1 } }
  ]

  const stats = await Order.aggregate(pipeline)
  console.log('\n📈 Payment Status Statistics:')
  for (const stat of stats) {
    console.log(`  ${stat._id.method} - ${stat._id.status}: ${stat.count}`)
  }

} catch (error) {
  console.error('❌ Inspection failed:', error)
} finally {
  await mongoose.disconnect()
  console.log('\n👋 Disconnected from MongoDB')
}