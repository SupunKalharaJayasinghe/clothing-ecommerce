import 'dotenv/config'
import mongoose from 'mongoose'
import Order from '../api/models/Order.js'
import { env } from '../config/env.js'

async function run() {
  const uri = env.MONGO_URI || process.env.MONGO_URI
  if (!uri) {
    console.error('MONGO_URI not set')
    process.exit(1)
  }
  await mongoose.connect(uri)
  const now = new Date()
  const res = await Order.updateMany(
    {
      'payment.method': 'BANK',
      'payment.status': 'pending_verification',
      'payment.bank.verifyBy': { $lte: now },
      'payment.bank.verifiedAt': { $exists: false }
    },
    { $set: { 'payment.status': 'failed' } }
  )
  console.log(`Expired ${res.modifiedCount} unverified bank transfer(s).`)
  await mongoose.disconnect()
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
