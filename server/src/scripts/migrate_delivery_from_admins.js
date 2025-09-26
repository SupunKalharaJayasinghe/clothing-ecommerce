import 'dotenv/config'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import Admin from '../api/models/Admin.js'
import Delivery from '../api/models/Delivery.js'
import { env } from '../config/env.js'

async function run() {
  const uri = env.MONGO_URI || process.env.MONGO_URI
  if (!uri) { console.error('MONGO_URI not set'); process.exit(1) }
  await mongoose.connect(uri)

  const admins = await Admin.find({ roles: 'delivery_agent' }).lean()
  console.log(`Found ${admins.length} admin(s) with delivery_agent role`)

  let created = 0
  for (const a of admins) {
    const exists = await Delivery.findOne({ username: a.username.toLowerCase() })
    if (exists) { console.log(`Skip ${a.username} (already migrated)`); continue }
    const pwd = Math.random().toString(36).slice(2, 10) + 'Aa1!'
    const hash = await bcrypt.hash(pwd, 12)
    const d = await Delivery.create({
      firstName: a.firstName,
      lastName: a.lastName,
      username: a.username.toLowerCase(),
      email: a.email,
      password: hash,
      active: true
    })
    console.log(`Created delivery user ${d.username}; temp password (store safely): ${pwd}`)
    created++
  }

  await mongoose.disconnect()
  console.log(`Done. Created ${created} delivery user(s).`)
}

run().catch(err => { console.error(err); process.exit(1) })
