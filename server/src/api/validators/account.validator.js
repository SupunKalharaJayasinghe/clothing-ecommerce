import { z } from 'zod'

// same policy as auth
const passwordSchema = z.string()
  .min(8).max(128)
  .regex(/[a-z]/, 'Needs lowercase')
  .regex(/[A-Z]/, 'Needs uppercase')
  .regex(/[0-9]/, 'Needs number')
  .regex(/[^\w\s]/, 'Needs symbol')
  .refine(v => !/\s/.test(v), 'No spaces')

export const profileUpdateSchema = z.object({
  body: z.object({
    firstName: z.string().min(2).max(60),
    lastName: z.string().min(2).max(60),
    username: z.string().min(3).max(30).regex(/^[a-z0-9_.]+$/),
    email: z.string().email(),
    mobile: z.string().min(7).max(20).optional().or(z.literal('')),
    gender: z.enum(['male','female','other','prefer_not_to_say']),
    birthday: z.string().optional().or(z.literal('')),  // ISO date string
    country: z.string().min(2).max(60).optional().or(z.literal(''))
  })
})

export const passwordChangeSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1)
  }).superRefine((d, ctx) => {
    if (d.newPassword !== d.confirmPassword) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['confirmPassword'], message: 'Passwords do not match' })
    }
  })
})

export const addressCreateSchema = z.object({
  body: z.object({
    label: z.string().optional(),
    line1: z.string().min(2),
    line2: z.string().optional(),
    city: z.string().min(2),
    region: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().min(2),
    phone: z.string().optional(),
    isDefault: z.boolean().optional()
  })
})

export const addressUpdateSchema = z.object({
  body: addressCreateSchema.shape.body
})

export const notificationsUpdateSchema = z.object({
  body: z.object({
    purchases: z.boolean(),
    account: z.boolean(),
    events: z.boolean()
  })
})

// Payment method: we only accept gateway tokenized cards (no PAN)
export const paymentMethodCreateSchema = z.object({
  body: z.object({
    gateway: z.literal('PAYHERE'),
    type: z.literal('card'),
    tokenId: z.string().min(2),
    brand: z.string().optional(),
    last4: z.string().optional(),
    expMonth: z.number().int().min(1).max(12).optional(),
    expYear: z.number().int().min(2024).max(2100).optional(),
    label: z.string().optional()
  })
})

// Account deletion request
export const deletionRequestCreateSchema = z.object({
  body: z.object({
    reason: z.string().min(10, 'Please provide a short reason (min 10 chars)').max(1000).optional()
  })
})
