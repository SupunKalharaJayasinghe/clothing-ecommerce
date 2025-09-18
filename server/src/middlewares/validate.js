import { ZodError } from 'zod'

export const validate =
  (schema) =>
  (req, _res, next) => {
    try {
      const parsed = schema.parse({ body: req.body, params: req.params, query: req.query })
      req.body = parsed.body
      req.params = parsed.params
      req.query = parsed.query
      next()
    } catch (err) {
      if (err instanceof ZodError) {
        err.status = 400
      }
      next(err)
    }
  }
