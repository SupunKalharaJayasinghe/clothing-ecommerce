import 'dotenv/config'
import { env } from './config/env.js'
import { connectDB } from './config/db.js'
import { createServer } from './server.js'

async function bootstrap() {
  const app = createServer()

  if (env.MONGO_URI) {
    await connectDB(env.MONGO_URI).catch((err) => {
      console.error('Mongo connection failed:', err.message)
    })
  } else {
    console.warn('MONGO_URI not set — starting API without DB connection.')
  }

  const server = app.listen(env.PORT, () => {
    console.log(`API ready on http://localhost:${env.PORT}`)
  })

  const shutdown = (sig) => () => {
    console.log(`\n${sig} received, shutting down...`)
    server.close(() => process.exit(0))
  }
  process.on('SIGINT', shutdown('SIGINT'))
  process.on('SIGTERM', shutdown('SIGTERM'))
}

bootstrap()
