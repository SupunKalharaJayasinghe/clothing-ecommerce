import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import morgan from 'morgan'
import path from 'path'
import { fileURLToPath } from 'url'
import { env } from './config/env.js'
import { cspDirectives, corsOptions, apiRateLimiter, authBurstLimiter } from './config/security.js'
import { refreshJwtIfNeeded } from './middlewares/session.js'
import { csrfProtection } from './middlewares/csrf.js'

// routes
import healthRoutes from './api/routes/health.routes.js'
import authRoutes from './api/routes/auth.routes.js'
import productRoutes from './api/routes/product.routes.js'
import accountRoutes from './api/routes/account.routes.js'
import favoriteRoutes from './api/routes/favorite.routes.js'
import orderRoutes from './api/routes/order.routes.js'
import paymentRoutes from './api/routes/payment.routes.js'
import refundRoutes from './api/routes/refund.routes.js'
import adminAuthRoutes from './api/routes/admin.auth.routes.js'
import adminAdminsRoutes from './api/routes/admin.admins.routes.js'
import adminCustomersRoutes from './api/routes/admin.customers.routes.js'
import adminProductsRoutes from './api/routes/admin.products.routes.js'
import adminOrdersRoutes from './api/routes/admin.orders.routes.js'
import adminReviewsRoutes from './api/routes/admin.reviews.routes.js'
import adminPaymentsRoutes from './api/routes/admin.payments.routes.js'
import adminReturnsRoutes from './api/routes/admin.returns.routes.js'
import adminRefundsRoutes from './api/routes/admin.refunds.routes.js'
import adminStatsRoutes from './api/routes/admin.stats.routes.js'
import adminDeliveryRoutes from './api/routes/admin.delivery.routes.js'
import adminDeliveryUploadRoutes from './api/routes/admin.delivery.upload.routes.js'
import deliveryCodRoutes from './api/routes/delivery.cod.routes.js'
import deliveryOrdersRoutes from './api/routes/delivery.orders.routes.js'
import deliveryAuthRoutes from './api/routes/delivery.auth.routes.js'

// error handlers
import { notFound, errorHandler } from './middlewares/error.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export function createServer() {
  const app = express()

  // Security: hide Express signature
  app.disable('x-powered-by')
  app.set('trust proxy', 1)

  app.use(
    helmet({
      contentSecurityPolicy: { useDefaults: true, directives: cspDirectives }
    })
  )
  app.use(cors(corsOptions))
  app.use(compression())
  app.use(cookieParser())
  // CSRF double-submit protection (issues a readable cookie on safe requests)
  app.use(csrfProtection)
  app.use(refreshJwtIfNeeded)
  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ extended: true }))
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'))

  // Rate limit
  app.use('/api', apiRateLimiter)
  // Apply a separate burst limiter only to sensitive auth endpoints
  app.use('/api/auth/login', authBurstLimiter)
  app.use('/api/auth/register', authBurstLimiter)
  app.use('/api/auth/2fa/verify', authBurstLimiter)

  // serve uploaded bank slips (read-only)
  app.use('/files/receipts', express.static(path.resolve(__dirname, 'files', 'receipts')))
  // serve delivery uploads (profile photos, licenses)
  app.use('/files/delivery', express.static(path.resolve(__dirname, 'files', 'delivery')))
  // serve return request photos
  app.use('/files/returns', express.static(path.resolve(__dirname, 'files', 'returns')))

  // routes
  app.use('/api/health', healthRoutes)
  app.use('/api/auth', authRoutes)
  app.use('/api/products', productRoutes)
  app.use('/api/account', accountRoutes)
  app.use('/api/favorites', favoriteRoutes)
  app.use('/api/orders', orderRoutes)
  app.use('/api/payments', paymentRoutes)
  app.use('/api/refunds', refundRoutes)
  // Admin dashboard APIs
  app.use('/api/admin/auth', adminAuthRoutes)
  app.use('/api/admin/admins', adminAdminsRoutes)
  app.use('/api/admin/customers', adminCustomersRoutes)
  // Delivery users management for admins
  app.use('/api/admin/delivery', adminDeliveryRoutes)
  app.use('/api/admin/delivery', adminDeliveryUploadRoutes)

  // Delivery staff auth & APIs (separate cookie/JWT)
  app.use('/api/delivery/auth', deliveryAuthRoutes)
  app.use('/api/admin/products', adminProductsRoutes)
  // Orders management
  app.use('/api/admin/orders', adminOrdersRoutes)
  // Reviews moderation
  app.use('/api/admin/reviews', adminReviewsRoutes)
  // Payments management
  app.use('/api/admin/payments', adminPaymentsRoutes)
  // Returns management
  app.use('/api/admin/returns', adminReturnsRoutes)
  // Refunds overview
  app.use('/api/admin/refunds', adminRefundsRoutes)
  // Delivery staff limited COD management
  app.use('/api/delivery/cod', deliveryCodRoutes)
  // Delivery staff general orders listing and status updates
  app.use('/api/delivery/orders', deliveryOrdersRoutes)

  // Admin system stats for dashboard overview
  app.use('/api/admin/stats', adminStatsRoutes)

  app.use(notFound)
  app.use(errorHandler)

  return app
}