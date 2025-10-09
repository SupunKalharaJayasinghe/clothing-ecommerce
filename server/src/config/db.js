import mongoose from 'mongoose'

export async function connectDB(uri) {
  // Prefer failing fast instead of buffering model operations for a long time
  mongoose.set('strictQuery', true)
  mongoose.set('bufferCommands', false)

  try {
    const conn = await mongoose.connect(uri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 10000,
      // dns cache issues sometimes cause SRV lookup problems; prefer IPv4 first in Node >=18
      // You can also set: process.env.NODE_OPTIONS = '--dns-result-order=ipv4first'
    })
    const { name, host, port } = conn.connection
    console.log(`MongoDB connected → db="${name}" @ ${host}:${port ?? 'srv'}`)
  } catch (err) {
    // Improve diagnostics for common DNS SRV failures
    const msg = String(err?.message || err)
    if (/querySrv ENOTFOUND/i.test(msg)) {
      console.error('\n[MongoDB] DNS SRV lookup failed for your mongodb+srv URI.')
      console.error('• Check internet/DNS connectivity (try 8.8.8.8 / 1.1.1.1).')
      console.error('• Or use the standard mongodb:// (non-SRV) connection string from Atlas Connect > Drivers.')
    }
    throw err
  }
}
