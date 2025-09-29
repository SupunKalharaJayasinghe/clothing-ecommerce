import { z } from 'zod'

const paramsWithSlug = z.object({
  slug: z.string().min(1, 'Product slug is required')
})

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid review id')

export const reviewsListSchema = z.object({
  params: paramsWithSlug,
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional()
  })
})

export const myReviewsListSchema = z.object({
  params: paramsWithSlug,
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional()
  })
})

export const reviewCreateSchema = z.object({
  params: paramsWithSlug,
  body: z.object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().min(3).max(2000)
  })
})

export const reviewUpdateSchema = z.object({
  params: z.object({
    slug: z.string().min(1, 'Product slug is required'),
    id: objectId
  }),
  body: z.object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().min(3).max(2000)
  })
})

export const reviewDeleteSchema = z.object({
  params: z.object({
    slug: z.string().min(1, 'Product slug is required'),
    id: objectId
  })
})
