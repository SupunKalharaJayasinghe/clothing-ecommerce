// server/src/scripts/backfill_color_lower.js
import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from '../config/db.js'
import Product from '../api/models/Product.js'
import { env } from '../config/env.js'

async function main() {
  const uri = env.MONGO_URI
  if (!uri) {
    console.error('MONGO_URI is not set. Please configure server/.env')
    process.exit(1)
  }
  await connectDB(uri)

  // Use aggregation pipeline update to set colorLower = toLower(color)
  const res = await Product.updateMany(
    {},
    [ { $set: { colorLower: { $toLower: '$color' } } } ]
  )
  console.log('Backfill complete:', res.acknowledged ? (res.modifiedCount ?? res.nModified) : 'done')
  await mongoose.connection.close()
}

main().catch((e) => { console.error(e); process.exit(1) })
