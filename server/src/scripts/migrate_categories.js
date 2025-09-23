import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from '../config/db.js'
import Category from '../api/models/Category.js'
import Product from '../api/models/Product.js'

function toSlug(str) {
  return String(str).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
}

async function upsertCategory(name, parent = null, sortOrder = 0) {
  const slug = toSlug(name)
  const existing = await Category.findOne({ slug })
  if (existing) return existing
  return Category.create({ name, slug, parent, sortOrder, active: true })
}

async function run() {
  const uri = process.env.MONGO_URI
  if (!uri) {
    console.error('❌ MONGO_URI not set. Please provide a MongoDB connection string in .env')
    process.exit(1)
  }

  await connectDB(uri)

  console.log('🔧 Migrating categories and linking products...')

  // Ensure default top-level categories
  const men = await upsertCategory('Men', null, 1)
  const women = await upsertCategory('Women', null, 2)
  const kids = await upsertCategory('Kids', null, 3)

  const map = new Map([
    ['men', men._id],
    ['women', women._id],
    ['kids', kids._id]
  ])

  let updated = 0
  for (const [key, cid] of map.entries()) {
    const res = await Product.updateMany(
      { category: new RegExp('^' + key + '$', 'i') },
      { $set: { categoryRef: cid } }
    )
    updated += res.modifiedCount || 0
    console.log(`  • Linked ${res.modifiedCount || 0} products to category ${key}`)
  }

  console.log(`✅ Migration complete. Products updated: ${updated}`)

  await mongoose.disconnect()
  console.log('👋 Disconnected')
}

run().catch(async (err) => {
  console.error('❌ Migration failed:', err)
  try { await mongoose.disconnect() } catch {}
  process.exit(1)
})
