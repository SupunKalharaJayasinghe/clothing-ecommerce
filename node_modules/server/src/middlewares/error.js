export function notFound(_req, res, _next) {
  res.status(404).json({ ok: false, message: 'Not Found' })
}

export function errorHandler(err, _req, res, _next) {
  const isZod = err?.name === 'ZodError'
  const isMongoDup = err?.code === 11000

  let status = err.status || (isZod ? 400 : isMongoDup ? 409 : 500)
  let message = err.message || (isZod ? 'Validation error' : 'Internal Server Error')

  if (isZod && Array.isArray(err.issues)) {
    message = err.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')
  }

  if (isMongoDup) {
    const fields = Object.keys(err.keyValue || {}).join(', ')
    message = `Duplicate value for: ${fields || 'unique field'}`
  }

  if (process.env.NODE_ENV !== 'production') {
    console.error(err)
  }
  res.status(status).json({ ok: false, message })
}
