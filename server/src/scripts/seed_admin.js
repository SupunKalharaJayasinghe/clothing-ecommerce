import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from '../../src/config/db.js'
import Admin from '../../src/api/models/Admin.js'

async function run() {
  const uri = process.env.MONGO_URI
  if (!uri) {
    console.error('MONGO_URI not set. Please provide a MongoDB connection string in .env')
    process.exit(1)
  }
  await connectDB(uri)

  const email = String(process.env.ADMIN_EMAIL || '').toLowerCase()
  const username = String(process.env.ADMIN_USERNAME || '').toLowerCase()
  const firstName = process.env.ADMIN_FIRSTNAME || 'Admin'
  const lastName = process.env.ADMIN_LASTNAME || 'User'
  const password = process.env.ADMIN_PASSWORD

  if (!email || !username || !password) {
    console.error('ADMIN_EMAIL, ADMIN_USERNAME, and ADMIN_PASSWORD are required')
    process.exit(1)
  }

  const bcrypt = await import('bcryptjs')
  const hash = await bcrypt.default.hash(password, 12)

  let primary = await Admin.findOne({ isPrimaryAdmin: true })
  if (primary) {
    console.log('Primary admin exists. Updating info...')
    primary.firstName = firstName
    primary.lastName = lastName
    primary.email = email
    primary.username = username
    primary.password = hash
    if (!primary.roles?.includes('admin')) primary.roles = Array.from(new Set([...(primary.roles||[]), 'admin']))
    await primary.save()
    console.log('Primary admin updated:', primary.email)
  } else {
    console.log('Creating primary admin...')
    primary = await Admin.create({
      firstName,
      lastName,
      email,
      username,
      password: hash,
      roles: ['admin'],
      isPrimaryAdmin: true
    })
    console.log('Primary admin created:', primary.email)
  }

  await mongoose.connection.close()
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
