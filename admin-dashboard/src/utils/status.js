// Admin dashboard status-to-class helpers

// Payment statuses (uppercase): UNPAID, PENDING, AUTHORIZED, PAID, FAILED, REFUND_PENDING, REFUNDED
export function paymentStatusClass(status) {
  const v = String(status || '').toUpperCase()
  switch (v) {
    case 'PAID':
    case 'REFUNDED':
      return 'text-green-400 bg-green-500/10 border-green-500/20'
    case 'PENDING':
    case 'REFUND_PENDING':
    case 'AUTHORIZED':
      return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
    case 'FAILED':
      return 'text-red-400 bg-red-500/10 border-red-500/20'
    default:
      return 'text-[color:var(--text-muted)] bg-[color:var(--surface-elevated)] border-[color:var(--surface-border)]'
  }
}

// Refund statuses (uppercase): REQUESTED, APPROVED, PROCESSING, PROCESSED, FAILED, CANCELLED
export function refundStatusClass(status) {
  const v = String(status || '').toUpperCase()
  switch (v) {
    case 'PROCESSED':
      return 'text-green-400 bg-green-500/10 border-green-500/20'
    case 'REQUESTED':
      return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
    case 'APPROVED':
    case 'PROCESSING':
      return 'text-blue-400 bg-blue-500/10 border-blue-500/20'
    case 'FAILED':
    case 'CANCELLED':
      return 'text-red-400 bg-red-500/10 border-red-500/20'
    default:
      return 'text-[color:var(--text-muted)] bg-[color:var(--surface-elevated)] border-[color:var(--surface-border)]'
  }
}

// Return statuses (lowercase in UI): requested, approved, rejected, received, closed
export function returnStatusClass(status) {
  const v = String(status || '').toLowerCase()
  switch (v) {
    case 'approved':
    case 'received':
    case 'closed':
      return 'text-green-400 bg-green-500/10 border-green-500/20'
    case 'requested':
      return 'text-blue-400 bg-blue-500/10 border-blue-500/20'
    case 'rejected':
      return 'text-red-400 bg-red-500/10 border-red-500/20'
    default:
      return 'text-[color:var(--text-muted)] bg-[color:var(--surface-elevated)] border-[color:var(--surface-border)]'
  }
}