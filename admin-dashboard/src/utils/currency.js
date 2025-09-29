export function formatLKR(value, opts = {}) {
  const amount = Number(value) || 0
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'LKR',
      maximumFractionDigits: 2,
      ...opts,
    }).format(amount)
  } catch {
    const min = opts.minimumFractionDigits ?? 0
    const max = opts.maximumFractionDigits ?? 2
    const num = amount.toLocaleString(undefined, { minimumFractionDigits: min, maximumFractionDigits: max })
    return `Rs. ${num}`
  }
}
