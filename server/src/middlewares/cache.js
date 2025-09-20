// server/src/middlewares/cache.js
// Simple in-memory micro-cache for public GET endpoints.
// Not for sensitive or user-specific data. Use a small TTL.

const DEFAULT_MAX_SIZE = 500

class MicroCacheStore {
  constructor(maxSize = DEFAULT_MAX_SIZE) {
    this.maxSize = maxSize
    this.map = new Map() // key -> { expires, status, headers, payload }
  }
  get(key) {
    const v = this.map.get(key)
    if (!v) return null
    if (Date.now() > v.expires) {
      this.map.delete(key)
      return null
    }
    return v
  }
  set(key, value) {
    // evict oldest if needed
    if (this.map.size >= this.maxSize) {
      const firstKey = this.map.keys().next().value
      if (firstKey) this.map.delete(firstKey)
    }
    this.map.set(key, value)
  }
}

const store = new MicroCacheStore()

export function microCache(ttlSeconds = 20) {
  return function (req, res, next) {
    try {
      if (req.method !== 'GET') return next()
      const key = req.originalUrl || req.url || ''
      const hit = store.get(key)
      if (hit) {
        // apply cached headers (excluding sensitive)
        res.set('X-Micro-Cache', 'HIT')
        if (hit.headers) {
          for (const [k, v] of Object.entries(hit.headers)) {
            // avoid setting forbidden headers like content-length
            if (k.toLowerCase() !== 'content-length') res.set(k, v)
          }
        }
        return res.status(hit.status || 200).json(hit.payload)
      }

      // wrap res.json to store payload on success
      const origJson = res.json.bind(res)
      res.set('X-Micro-Cache', 'MISS')
      res.json = (body) => {
        try {
          if (res.statusCode === 200) {
            // cache minimal headers (Cache-Control is set by handlers)
            const headers = {}
            const cc = res.get('Cache-Control')
            if (cc) headers['Cache-Control'] = cc
            store.set(key, {
              expires: Date.now() + ttlSeconds * 1000,
              status: 200,
              headers,
              payload: body
            })
          }
        } catch {}
        return origJson(body)
      }

      next()
    } catch {
      next()
    }
  }
}
