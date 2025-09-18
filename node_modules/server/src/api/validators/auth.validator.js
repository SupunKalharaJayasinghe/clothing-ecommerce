import { z } from 'zod'

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
    identifier: z.string().min(3),
    password: z.string().min(1)
  })
})

export const twoFAVerifySchema = z.object({
  body: z.object({
    tmpToken: z.string().min(10),
    code: z.string().min(4),
    remember: z.boolean().optional()
  })
})

export const forgotPasswordSchema = z.object({
  body: z.object({
    identifier: z.string().min(3) // username or email
  })
})

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(10),
    newPassword: passwordSchema,
    confirmPassword: z.string()
  }).superRefine((d, ctx) => {
    if (d.newPassword !== d.confirmPassword) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['confirmPassword'], message: 'Passwords do not match' })
    }
  })
})
