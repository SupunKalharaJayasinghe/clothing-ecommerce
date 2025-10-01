import { z } from 'zod'

// Allow either a full address snapshot OR a reference to a saved address
const AddressSchema = z.object({
  line1: z.string().min(3),
  city: z.string().min(2),
  country: z.string().min(2),
  phone: z.string().min(7),
  label: z.string().optional(),
  line2: z.string().optional(),
  region: z.string().optional(),
  postalCode: z.string().optional()
})

export const placeOrderSchema = z.object({
  body: z
    .object({
      method: z.enum(['COD','CARD','BANK']),
      items: z
        .array(
          z.object({
            slug: z.string().min(1),
            quantity: z.number().int().min(1).max(99)
          })
        )
        .min(1),
      // Allow two-step card confirmation flag to pass through validation
      confirm: z.boolean().optional()
    })
    // Preserve any additional body keys (e.g., address, addressId)
    .passthrough()
    .and(
      z
        .union([
          z.object({ address: AddressSchema }),
          z.object({ addressId: z.string().min(8) })
        ])
        .optional()
    )
})

export const getOrderSchema = z.object({
  params: z.object({
    id: z.string().min(8)
  })
})

export const cancelOrderSchema = z.object({
  params: z.object({ id: z.string().min(8) }),
  body: z.object({ reason: z.string().min(1).optional() }).passthrough()
})

export const requestReturnSchema = z.object({
  params: z.object({ id: z.string().min(8) }),
  body: z.object({
    reason: z.string().min(3).max(500),
    description: z.string().min(0).max(2000).optional(),
    // Accept items either as JSON string (from multipart form) or as parsed array
    items: z.union([
      z.array(z.object({ slug: z.string().min(1), quantity: z.number().int().min(1).max(99) })).min(1),
      z.array(z.string().min(1)).min(1),
      z.string().min(2)
    ]).transform((v) => {
      if (typeof v === 'string') {
        try {
          const parsed = JSON.parse(v)
          return parsed
        } catch {
          throw new Error('Invalid items JSON')
        }
      }
      return v
    })
  })
})
