export function formatOrderId(id) {
  try {
    const s = String(id || '')
    if (!s) return '#'
    return '#' + s.slice(-8)
  } catch (e) {
    return '#'
  }
}
