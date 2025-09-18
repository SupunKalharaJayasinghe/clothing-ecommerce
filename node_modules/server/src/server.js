import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import morgan from 'morgan'
import { env } from './config/env.js'
import { cspDirectives, corsOptions, apiRateLimiter } from './config/security.js'

// routes
import healthRoutes from './api/routes/health.routes.js'
import authRoutes from './api/routes/auth.routes.js'
import productRoutes from './api/routes/product.routes.js'
import accountRoutes from './api/routes/account.routes.js' // <-- NEW

// error handlers
import { notFound, errorHandler } from './middlewares/error.js'

export function createServer() {
  const app = express()

  // trust proxy (needed if deployed behind nginx/proxy for secure cookies, harmless locally)
  app.set('trust proxy', 1)

  // security & essentials
  app.use(
    helmet({
      contentSecurityPolicy: { useDefaults: true, directives: cspDirectives }
    })
  )
  app.use(cors(corsOptions))
  app.use(compression())
  app.use(cookieParser())
  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ extended: true }))
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'))

  // rate limit (tighten later per sensitive routes)
  app.use('/api', apiRateLimiter)

  // routes
  app.use('/api/health', healthRoutes)
  app.use('/api/auth', authRoutes)
  app.use('/api/products', productRoutes)
  app.use('/api/account', accountRoutes) // <-- NEW

  // 404 + error handling
  app.use(notFound)
  app.use(errorHandler)

  return app
}
