// server/src/api/validators/product.validator.js
import { z } from 'zod'

const sortEnum = z.enum(['new','price_asc','price_desc','rating']).default('new')
const stockEnum = z.enum(['any','in','low','out']).default('any')
const mainTagEnum = z.enum(['any','new','old']).default('any')
const categoryEnum = z.enum(['men','women','kids']).optional()

const numericString = z.string().regex(/^\d+(?:\.\d+)?$/, 'Must be a number')
const intString = z.string().regex(/^\d+$/, 'Must be an integer')

// Accept empty string as "not provided" for optional numeric fields
const numericStringOrEmpty = z.union([numericString, z.literal('')]).optional()

// Page/limit are often omitted; accept empty or missing
const pageOrEmpty = z.union([intString, z.literal('')]).optional()
const limitOrEmpty = z.union([intString, z.literal('')]).optional()

export const listProductsSchema = z.object({
  // Be permissive for list queries to avoid blocking UI; controller sanitizes
  query: z.record(z.any()).optional()
})

export const productSlugSchema = z.object({
  params: z.object({ slug: z.string().min(1) })
})

export const highlightsSchema = z.object({
  query: z.object({
    q: z.string().optional(),
    category: categoryEnum,
    categoryId: z.string().min(8).optional(),
    limit: intString.optional()
  })
})

export const suggestSchema = z.object({
  query: z.object({
    q: z.string().min(1)
  })
})
