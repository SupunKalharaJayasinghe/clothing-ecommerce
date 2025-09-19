import ApiError from '../utils/ApiError.js'

/**
 * Wrap a zod schema that can validate any of: { body, query, params }.
 * Only overwrite req.* when that key exists in the parsed result.
 */
export const validate = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params
    })

    if (Object.prototype.hasOwnProperty.call(parsed, 'body')) {
      req.body = parsed.body
    }
    if (Object.prototype.hasOwnProperty.call(parsed, 'query')) {
      req.query = parsed.query
    }
    if (Object.prototype.hasOwnProperty.call(parsed, 'params')) {
      req.params = parsed.params
    }

    next()
  } catch (err) {
    // zod error formatting
    const message = err?.issues?.map((i) => i.message).join(', ') || err.message || 'Validation error'
    next(new ApiError(400, message))
  }
}
