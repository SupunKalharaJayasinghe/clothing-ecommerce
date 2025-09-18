export function notFound(req, res, next) {
  res.status(404).json({ ok: false, message: 'Not Found' })
}

export function errorHandler(err, req, res, next) {
  const status = err.status || 500
  const msg = err.message || 'Internal Server Error'
  if (process.env.NODE_ENV !== 'production') {
    console.error(err)
  }
  res.status(status).json({ ok: false, message: msg })
}
