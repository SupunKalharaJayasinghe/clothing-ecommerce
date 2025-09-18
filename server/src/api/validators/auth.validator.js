import { z } from 'zod'

// Password: 8-128, ≥1 lower, ≥1 upper, ≥1 digit, ≥1 symbol, no spaces
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .regex(/[a-z]/, 'Password needs a lowercase letter')
  .regex(/[A-Z]/, 'Password needs an uppercase letter')
  .regex(/[0-9]/, 'Password needs a number')
  .regex(/[^\w\s]/, 'Password needs a symbol')
  .refine((v) => !/\s/.test(v), 'Password cannot contain spaces')

export const registerSchema = z.object({
  body: z.object({
    firstName: z.string().min(2).max(60),
    lastName: z.string().min(2).max(60),
    username: z.string().min(3).max(30).regex(/^[a-z0-9_.]+$/, 'Username can contain lowercase letters, numbers, underscore, dot'),
    email: z.string().email(),
    password: passwordSchema,
    confirmPassword: z.string()
  }).superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Passwords do not match', path: ['confirmPassword'] })
    }
  })
})

export const loginSchema = z.object({
  body: z.object({
    identifier: z.string().min(3), // username or email
    password: z.string().min(1)
  })
})
