// Utilities to normalize admin/delivery filter/status inputs to canonical states
export function buildAdminStatusFilter(input) {
  if (!input) return null
  const raw = String(input)
  const s = raw.trim()
  if (!s) return null
  const u = s.toUpperCase()

  // Common admin-friendly aliases
  if (s === 'placed') {
    // Orders that have not been dispatched yet
    return { deliveryState: 'NOT_DISPATCHED' }
  }
  if (s === 'packed') {
    return { orderState: 'PACKING', deliveryState: 'NOT_DISPATCHED' }
  }
  if (s === 'dispatched') {
    return { deliveryState: 'SHIPPED' }
  }

  // Canonical ORDER states
  if (['CREATED','CONFIRMED','PACKING','CANCELLED','RETURN_REQUESTED','RETURNED'].includes(u)) {
    return { orderState: u }
  }

  // Canonical DELIVERY states
  if (['NOT_DISPATCHED','SHIPPED','IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERED','DELIVERY_FAILED','RTO_INITIATED','RETURNED_TO_WAREHOUSE'].includes(u)) {
    // Special handling: SHIPPED includes in-transit for admin list convenience
    if (u === 'SHIPPED') return { deliveryState: { $in: ['SHIPPED','IN_TRANSIT'] } }
    return { deliveryState: u }
  }

  // Special high-level status
  if (u === 'DELIVERED') return { deliveryState: 'DELIVERED' }
  if (u === 'RETURNED') return { $or: [ { orderState: 'RETURNED' }, { deliveryState: 'RETURNED_TO_WAREHOUSE' } ] }

  // Fallback to legacy status field if provided as uppercase/lowercase
  return { status: raw }
}
