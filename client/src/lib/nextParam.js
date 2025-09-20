// Small utility to read and sanitize `next` query param for post-auth redirects
export function getNextFromSearch(search) {
  try {
    const params = new URLSearchParams(search || '')
    const next = params.get('next')
    if (!next) return '/'
    // prevent loops or external redirects
    if (next.startsWith('/login') || next.startsWith('/register')) return '/'
    if (!next.startsWith('/')) return '/'
    return next
  } catch {
    return '/'
  }
}

export function sanitizeNextPath(next) {
  if (!next) return '/'
  if (next.startsWith('/login') || next.startsWith('/register')) return '/'
  if (!next.startsWith('/')) return '/'
  return next
}

export function getLoginPathWithNext(next) {
  const safe = sanitizeNextPath(next)
  return safe !== '/' ? `/login?next=${encodeURIComponent(safe)}` : '/login'
}

export function getRegisterPathWithNext(next) {
  const safe = sanitizeNextPath(next)
  return safe !== '/' ? `/register?next=${encodeURIComponent(safe)}` : '/register'
}
