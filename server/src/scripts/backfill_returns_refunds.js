import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from '../config/db.js'
import Order from '../api/models/Order.js'
import Return from '../api/models/Return.js'
import Refund from '../api/models/Refund.js'

async function run() {
  const uri = process.env.MONGO_URI
  if (!uri) {
    console.error('❌ MONGO_URI not set. Please provide a MongoDB connection string in .env')
    process.exit(1)
  }
  await connectDB(uri)

  console.log('🔧 Backfilling Return and Refund collections from Orders...')

  // Backfill Returns
  const ordersWithReturns = await Order.find({ 'returnRequest.status': { $exists: true } }).select('_id returnRequest').lean()
  let returnsCreated = 0
  for (const o of ordersWithReturns) {
    const rr = o.returnRequest || {}
    const update = {
      order: o._id,
      status: rr.status,
      reason: rr.reason,
      requestedAt: rr.requestedAt || new Date(),
      updatedAt: rr.updatedAt || rr.requestedAt || new Date(),
      closedAt: rr.closedAt
    }
    const res = await Return.updateOne({ order: o._id }, { $set: update, $setOnInsert: { createdBy: 'system' } }, { upsert: true })
    if (res.upsertedCount > 0) returnsCreated += 1
  }
  console.log(`✅ Returns backfill done. Upserts: ${returnsCreated}`)

  // Backfill Refunds based on payment.status on Orders
  const refundable = await Order.find({ 'payment.status': { $in: ['REFUND_PENDING','REFUNDED','FAILED'] } }).select('_id payment totals').lean()
  let refundsCreated = 0
  for (const o of refundable) {
    const pay = o.payment || {}
    const status = String(pay.status)
    const map = {
      REFUND_PENDING: { status: 'REQUESTED', tsField: 'requestedAt' },
      REFUNDED: { status: 'PROCESSED', tsField: 'processedAt' },
      FAILED: { status: 'FAILED', tsField: 'failedAt' }
    }
    const m = map[status]
    if (!m) continue
    const base = {
      order: o._id,
      method: pay.method,
      amount: o.totals?.grandTotal,
      currency: 'LKR',
      status: m.status
    }
    const setFields = { ...base }
    setFields[m.tsField] = new Date()
    const res = await Refund.updateOne(
      { order: o._id },
      { $setOnInsert: { requestedAt: new Date(), createdBy: 'system' }, $set: setFields },
      { upsert: true }
    )
    if (res.upsertedCount > 0) refundsCreated += 1
  }
  console.log(`✅ Refunds backfill done. Upserts: ${refundsCreated}`)

  await mongoose.disconnect()
  console.log('👋 Disconnected')
}

run().catch(async (err) => {
  console.error('❌ Backfill failed:', err)
  try { await mongoose.disconnect() } catch {}
  process.exit(1)
})
