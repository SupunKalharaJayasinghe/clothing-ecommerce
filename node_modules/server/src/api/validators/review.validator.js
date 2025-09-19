import { z } from 'zod'

const paramsWithSlug = z.object({
  slug: z.string().min(1, 'Product slug is required')
})

export const reviewsListSchema = z.object({
  params: paramsWithSlug,
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional()
  })
})

export const reviewUpsertSchema = z.object({
  params: paramsWithSlug,
  body: z.object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().min(3).max(2000)
  })
})

export const reviewMeParamSchema = z.object({
  params: paramsWithSlug
})
