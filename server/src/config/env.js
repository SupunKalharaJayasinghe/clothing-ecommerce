import { z } from 'zod'

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  MONGO_URI: z.string().optional(),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // Auth/session
  JWT_SECRET: z.string().default('change-me-in-prod'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  COOKIE_SAMESITE: z.enum(['lax','strict','none']).default('lax'),
  COOKIE_SECURE: z.enum(['true','false']).default('false'),

  // Payments (optional)
  PAYHERE_MERCHANT_ID: z.string().optional(),
  PAYHERE_MERCHANT_SECRET: z.string().optional(),
  PAYHERE_RETURN_URL: z.string().optional(),
  PAYHERE_CANCEL_URL: z.string().optional(),
  PAYHERE_NOTIFY_URL: z.string().optional(),

  // Returns feature
  RETURN_WINDOW_DAYS: z.coerce.number().default(14),
  RETURN_NOTIFY_EMAIL: z.string().optional()
})

export const env = EnvSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  MONGO_URI: process.env.MONGO_URI,
  CORS_ORIGIN: process.env.CORS_ORIGIN,

  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
  COOKIE_SAMESITE: process.env.COOKIE_SAMESITE,
  COOKIE_SECURE: process.env.COOKIE_SECURE,

  PAYHERE_MERCHANT_ID: process.env.PAYHERE_MERCHANT_ID,
  PAYHERE_MERCHANT_SECRET: process.env.PAYHERE_MERCHANT_SECRET,
  PAYHERE_RETURN_URL: process.env.PAYHERE_RETURN_URL,
  PAYHERE_CANCEL_URL: process.env.PAYHERE_CANCEL_URL,
  PAYHERE_NOTIFY_URL: process.env.PAYHERE_NOTIFY_URL,

  RETURN_WINDOW_DAYS: process.env.RETURN_WINDOW_DAYS,
  RETURN_NOTIFY_EMAIL: process.env.RETURN_NOTIFY_EMAIL
})
