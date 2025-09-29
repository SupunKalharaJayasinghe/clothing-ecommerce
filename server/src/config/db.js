import mongoose from 'mongoose'

export async function connectDB(uri) {
  mongoose.set('strictQuery', true)
  const conn = await mongoose.connect(uri, { autoIndex: true })
  const { name, host, port } = conn.connection
  console.log(`MongoDB connected → db="${name}" @ ${host}:${port ?? 'srv'}`)
}
