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
  body: z.object({
    method: z.enum(['COD','CARD','BANK']),
    items: z.array(z.object({
      slug: z.string().min(1),
      quantity: z.number().int().min(1).max(99)
    })).min(1)
  }).and(
    z.union([
      z.object({ address: AddressSchema }),
      z.object({ addressId: z.string().min(8) })
    ]).optional()
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
