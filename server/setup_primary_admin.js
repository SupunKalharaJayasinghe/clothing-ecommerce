import 'dotenv/config'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { connectDB } from './src/config/db.js'
import Admin from './src/api/models/Admin.js'

const MAIN_ADMIN_EMAIL = 'oshanrajakaruna.studies@gmail.com'
const MAIN_ADMIN_USERNAME = 'admin'
const MAIN_ADMIN_PASSWORD = 'Admin123!' // Change this to your desired password

async function setupPrimaryAdmin() {
  try {
    const uri = process.env.MONGO_URI
    if (!uri) {
      console.error('MONGO_URI not set. Please check your .env file')
      process.exit(1)
    }

    await connectDB(uri)
    console.log('Connected to MongoDB')

    // Check if primary admin already exists
    const existingPrimary = await Admin.findOne({ isPrimaryAdmin: true })
    if (existingPrimary) {
      console.log('Primary admin already exists:', existingPrimary.email)
      
      // Update the existing primary admin
      const hash = await bcrypt.hash(MAIN_ADMIN_PASSWORD, 12)
      existingPrimary.firstName = 'Oshan'
      existingPrimary.lastName = 'Rajakaruna'
      existingPrimary.email = MAIN_ADMIN_EMAIL
      existingPrimary.username = MAIN_ADMIN_USERNAME
      existingPrimary.password = hash
      existingPrimary.roles = ['admin']
      existingPrimary.isPrimaryAdmin = true
      
      await existingPrimary.save()
      console.log('Primary admin updated successfully!')
      console.log('Email:', MAIN_ADMIN_EMAIL)
      console.log('Username:', MAIN_ADMIN_USERNAME)
      console.log('Password:', MAIN_ADMIN_PASSWORD)
    } else {
      // Check if admin with this email already exists
      const existingAdmin = await Admin.findOne({ 
        $or: [
          { email: MAIN_ADMIN_EMAIL },
          { username: MAIN_ADMIN_USERNAME }
        ]
      })

      if (existingAdmin) {
        console.log('Admin user exists, updating to primary admin...')
        const hash = await bcrypt.hash(MAIN_ADMIN_PASSWORD, 12)
        existingAdmin.firstName = 'Oshan'
        existingAdmin.lastName = 'Rajakaruna'
        existingAdmin.email = MAIN_ADMIN_EMAIL
        existingAdmin.username = MAIN_ADMIN_USERNAME
        existingAdmin.password = hash
        existingAdmin.roles = ['admin']
        existingAdmin.isPrimaryAdmin = true
        
        await existingAdmin.save()
        console.log('Existing admin updated to primary admin!')
      } else {
        // Create new primary admin
        console.log('Creating new primary admin...')
        const hash = await bcrypt.hash(MAIN_ADMIN_PASSWORD, 12)
        
        const primaryAdmin = await Admin.create({
          firstName: 'Oshan',
          lastName: 'Rajakaruna',
          email: MAIN_ADMIN_EMAIL,
          username: MAIN_ADMIN_USERNAME,
          password: hash,
          roles: ['admin'],
          isPrimaryAdmin: true
        })
        
        console.log('Primary admin created successfully!')
        console.log('Email:', primaryAdmin.email)
        console.log('Username:', primaryAdmin.username)
      }
    }

    console.log('\n✅ Primary admin setup complete!')
    console.log('📧 Email:', MAIN_ADMIN_EMAIL)
    console.log('👤 Username:', MAIN_ADMIN_USERNAME)
    console.log('🔑 Password:', MAIN_ADMIN_PASSWORD)
    console.log('\nYou can now login to the admin dashboard with these credentials.')
    
  } catch (error) {
    console.error('Error setting up primary admin:', error)
  } finally {
    await mongoose.connection.close()
    console.log('Database connection closed')
    process.exit(0)
  }
}

setupPrimaryAdmin()