import { z } from 'zod'

export const placeOrderSchema = {
  body: z.object({
    method: z.enum(['COD','CARD','BANK']),
    address: z.object({
      line1: z.string().min(3),
      city: z.string().min(2),
      country: z.string().min(2),
      phone: z.string().min(7),
      label: z.string().optional(),
      line2: z.string().optional(),
      region: z.string().optional(),
      postalCode: z.string().optional()
    }),
    items: z.array(z.object({
      slug: z.string().min(1),
      quantity: z.number().int().min(1).max(99)
    })).min(1)
  })
}

export const getOrderSchema = {
  params: z.object({
    id: z.string().min(8)
  })
}
