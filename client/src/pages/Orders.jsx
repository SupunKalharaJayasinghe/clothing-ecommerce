import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import api from '../lib/axios'
import Price from '../components/ui/Price'
import Badge from '../components/ui/Badge'
import Loader from '../components/ui/Loader'
import { ChevronDown, ChevronUp, Copy } from '../lib/icons'
import { clearCart } from '../features/cart/cartSlice'

export default function Orders() {
  const { user } = useAppSelector(s => s.auth)
  const dispatch = useAppDispatch()
  const location = useLocation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [orders, setOrders] = useState([])
  const [uploading, setUploading] = useState('') // orderId currently uploading slip
  const [expanded, setExpanded] = useState({}) // map of orderId => bool (mobile only)
  const [returnOpen, setReturnOpen] = useState(false)
  const [returnFor, setReturnFor] = useState(null)
  const [retReason, setRetReason] = useState('')
  const [retSel, setRetSel] = useState([]) // [slug]
  const [retSubmitting, setRetSubmitting] = useState(false)
  const [retFiles, setRetFiles] = useState([])

  // route-level protection handles redirects; no page-level redirects needed

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/orders/me')
        setOrders(data.items || [])
      } catch (e) {
        setError(e.response?.data?.message || e.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // If redirected back from PayHere with ?orderId, verify payment success and clear cart
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const id = params.get('orderId')
    if (!id) return
    (async () => {
      try {
        const { data } = await api.get(`/payments/payhere/status/${encodeURIComponent(id)}`)
        if (data?.ok && data.paid) {
          dispatch(clearCart())
          // Refresh orders to include the newly created order
          try {
            const { data: d2 } = await api.get('/orders/me')
            setOrders(d2.items || [])
          } catch {}
        }
      } catch (e) {
        // Silent: if status check fails, leave cart as-is
      } finally {
        // Clean the URL to remove the query param
        const url = new URL(window.location.href)
        url.searchParams.delete('orderId')
        navigate(url.pathname + url.search, { replace: true })
      }
    })()
  }, [location.search, dispatch, navigate])

  // Handy formatter for date/time
  const formatDate = useMemo(() => (iso) => {
    try { return new Date(iso).toLocaleString() } catch { return '' }
  }, [])

  async function uploadSlip(orderId, file) {
    if (!file) return
    try {
      setUploading(orderId)
      const form = new FormData()
      form.append('slip', file)
      await api.post(`/payments/bank/${orderId}/slip`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
      const { data } = await api.get('/orders/me')
      setOrders(data.items || [])
    } catch (e) {
      setError(e.response?.data?.message || e.message)
    } finally {
      setUploading('')
    }
  }

  function toneForOrderState(s) {
    const v = (s || '').toString().toUpperCase()
    // Legacy strings
    if (v === 'PLACED' || v === 'CREATED' || v === 'CONFIRMED') return 'blue'
    if (v === 'PACKING' || v === 'PACKED') return 'indigo'
    if (v === 'HANDED_OVER' || v === 'HANDOVER' || v === 'SHIPPED') return 'purple'
    if (v === 'PENDING_PAYMENT') return 'amber'
    if (v === 'DELIVERED' || v === 'COMPLETED') return 'green'
    if (v === 'CANCELLED' || v === 'CANCELED') return 'red'
    return 'gray'
  }
  function toneForDeliveryState(s) {
    const v = (s || '').toString().toUpperCase()
    if (!v || v === 'NOT_STARTED' || v === 'NOT_DISPATCHED') return 'gray'
    if (v === 'OUT_FOR_DELIVERY') return 'amber'
    if (v === 'DELIVERY_CONFIRMED' || v === 'DELIVERY_CONFIRM' || v === 'IN_TRANSIT' || v === 'SHIPPED') return 'blue'
    if (v === 'DELIVERED') return 'green'
    if (v === 'DELIVERY_FAILED' || v === 'FAILED') return 'red'
    if (v === 'RTO_INITIATED' || v === 'RETURNED_TO_WAREHOUSE') return 'purple'
    return 'gray'
  }
  function toneForPaymentStatus(s) {
    const v = (s || '').toString().toUpperCase()
    if (v === 'PAID' || v === 'REFUNDED') return 'green'
    if (v === 'PENDING' || v === 'REFUND_PENDING' || v === 'AUTHORIZED') return 'amber'
    if (v === 'FAILED') return 'red'
    if (v === 'UNPAID') return 'gray'
    return 'gray'
  }
  function toneForReturnStatus(s) {
    const v = (s || '').toString().toLowerCase()
    switch (v) {
      case 'requested': return 'blue'
      case 'approved': return 'green'
      case 'received': return 'blue'
      case 'rejected': return 'red'
      case 'closed': return 'green'
      default: return 'gray'
    }
  }

  function eligibleForReturn(o) {
    const paid = String(o.payment?.status || '').toUpperCase() === 'PAID'
    const delivered = (
      String(o.deliveryState || '').toUpperCase() === 'DELIVERED' ||
      String(o.orderState || '').toUpperCase() === 'DELIVERED' ||
      String(o.status || '').toUpperCase() === 'COMPLETED' ||
      String(o.status || '').toUpperCase() === 'DELIVERED'
    )
    const already = !!o.returnRequest?.status
    return paid && delivered && !already
  }

  function openReturnModal(o) {
    setReturnFor(o)
    setRetReason('')
    setRetSel([])
    setReturnOpen(true)
  }

  async function submitReturn() {
    if (!returnFor) return
    const selectedSlugs = retSel || []
    if (!retReason.trim() || selectedSlugs.length === 0) {
      alert('Please provide a reason and select at least one item.')
      return
    }
    try {
      setRetSubmitting(true)
      const fd = new FormData()
      fd.append('reason', retReason.trim())
      fd.append('description', retReason.trim())
      // Send only slugs; server will map to full ordered quantities
      fd.append('items', JSON.stringify(selectedSlugs))
      for (const f of retFiles) fd.append('photos', f)
      await api.post(`/orders/${returnFor._id}/return-request`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setReturnOpen(false)
      setReturnFor(null)
      setRetSel([])
      setRetReason('')
      setRetFiles([])
      const { data } = await api.get('/orders/me')
      setOrders(data.items || [])
    } catch (e) {
      alert(e.response?.data?.message || e.message)
    } finally {
      setRetSubmitting(false)
    }
  }

  if (loading) return <Loader />
  if (error) return <div className="container-app section text-red-600">{error}</div>

  return (
    <div className="container-app section">
      <h1 className="section-title">Your Orders</h1>
      {orders.length > 0 && (
        <p className="text-sm text-[--color-muted] mt-1">Status guide: <span className="font-medium">Confirmed</span> → <span className="font-medium">Packing</span> → <span className="font-medium">Shipped</span> → <span className="font-medium">Out for delivery</span> → <span className="font-medium">Delivered</span>. Payment badges show the latest payment state.</p>
      )}
      {orders.length === 0 && (
        <div className="mt-4 max-w-md">
          <div className="card card-body space-y-2 text-center">
            <div className="text-sm opacity-80">You have no orders yet.</div>
            <Link to="/products" className="btn btn-primary w-max mx-auto">Start shopping</Link>
          </div>
        </div>
      )}

      <div className="mt-6 space-y-5">
        {orders.map(o => (
          <div key={o._id} className="card">
            {/* Header */}
            <div className="p-4 border-b space-y-2">
              {/* Top row: Order ID + date and desktop total */}
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-xs opacity-60">Order</div>
                    <button
                      className="text-[11px] underline opacity-80 hover:opacity-100"
                      onClick={() => navigator.clipboard?.writeText(o._id).catch(() => {})}
                      title="Copy order ID"
                    >
                      <span className="font-mono">#{o._id}</span>
                      <span className="inline-flex ml-1 align-middle"><Copy size={12} /></span>
                    </button>
                  </div>
                  <div className="text-xs opacity-70 mt-0.5">{formatDate(o.createdAt)}</div>
                </div>
                <div className="hidden md:block font-semibold whitespace-nowrap">Total: <span className="whitespace-nowrap"><Price price={o.totals?.grandTotal} /></span></div>
              </div>

              {/* Badges row */}
              <div className="flex items-center gap-2 flex-wrap md:flex-nowrap overflow-x-auto py-1">
                <Badge tone={toneForOrderState(o.status || o.orderState)}>{(o.status || o.orderState) || '—'}</Badge>
                <Badge tone={toneForDeliveryState(o.deliveryState)}>
                  Delivery: {(((o.deliveryState || '').toString().toUpperCase()) === 'NOT_DISPATCHED') ? '—' : (o.deliveryState || '—')}
                </Badge>
                <Badge>{o.payment?.method}</Badge>
                {o.payment?.status && (
                  <Badge tone={toneForPaymentStatus(o.payment?.status)}>
                    {o.payment.status}
                  </Badge>
                )}
                {o.returnRequest?.status && (
                  <Badge tone={toneForReturnStatus(o.returnRequest.status)}>
                    Return: {o.returnRequest.status}
                  </Badge>
                )}
              </div>

              {/* Mobile total + toggle */}
              <div className="flex items-center justify-between gap-3 md:hidden mt-2">
                <div className="font-semibold whitespace-nowrap flex items-baseline gap-1">Total: <span className="whitespace-nowrap"><Price price={o.totals?.grandTotal} /></span></div>
                <button
                  className="btn btn-ghost btn-sm shadow-none hover:shadow-none focus:outline-none"
                  onClick={() => setExpanded(prev => ({ ...prev, [o._id]: !prev[o._id] }))}
                  aria-expanded={!!expanded[o._id]}
                  aria-controls={`order-details-${o._id}`}
                >
                  {expanded[o._id]
                    ? (<span className="inline-flex items-center gap-1">Hide details <ChevronUp /></span>)
                    : (<span className="inline-flex items-center gap-1">View details ({o.items?.length || 0}) <ChevronDown /></span>)}
                </button>
              </div>
            </div>

            {/* Details: always visible on md+, toggle on mobile */}
            <div id={`order-details-${o._id}`} className="p-4 grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2 hidden md:block">
                <h3 className="font-semibold mb-2">Items</h3>
                <div className="divide-y">
                  {o.items.map(it => (
                    <div key={it.slug} className="py-2 flex items-center justify-between text-sm gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        {it.image && <img src={it.image} alt={it.name} className="w-12 h-12 object-cover rounded border" />}
                        <div className="min-w-0">
                          <div className="font-medium leading-tight truncate">{it.name}</div>
                          <div className="opacity-70">{it.color} × {it.quantity}</div>
                        </div>
                      </div>
                      <div className="font-medium whitespace-nowrap"><Price price={it.price * it.quantity} /></div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mobile collapsible Items */}
              {expanded[o._id] && (
                <div className="md:col-span-2 md:hidden">
                  <h3 className="font-semibold mb-2">Items</h3>
                  <div className="divide-y">
                    {o.items.map(it => (
                      <div key={it.slug} className="py-3 text-sm gap-2">
                        <div className="grid grid-cols-[auto,1fr] items-center gap-3 min-w-0">
                          {it.image && <img src={it.image} alt={it.name} className="w-12 h-12 object-cover rounded border" />}
                          <div className="min-w-0">
                            <div className="font-medium leading-tight truncate">{it.name}</div>
                            <div className="opacity-70">{it.color} × {it.quantity}</div>
                          </div>
                        </div>
                        <div className="font-medium text-right mt-1 whitespace-nowrap"><Price price={it.price * it.quantity} /></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <aside className="space-y-3 hidden md:block">
                <div>
                  <h3 className="font-semibold mb-1">Delivery</h3>
                  <div className="text-sm">
                    <div>{o.address?.line1}{o.address?.line2 ? `, ${o.address.line2}` : ''}</div>
                    <div>{o.address?.city}{o.address?.region ? `, ${o.address.region}` : ''}</div>
                    <div>{o.address?.country}{o.address?.postalCode ? `, ${o.address.postalCode}` : ''}</div>
                    <div className="opacity-70 mt-1">Phone: {o.address?.phone}</div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-1">Totals</h3>
                  <div className="text-sm">
                    <div className="flex justify-between"><span>Subtotal</span><span className="whitespace-nowrap"><Price price={o.totals?.subtotal} /></span></div>
                    <div className="flex justify-between"><span>Shipping</span><span className="whitespace-nowrap"><Price price={o.totals?.shipping} /></span></div>
                    <div className="flex justify-between font-semibold"><span>Total</span><span className="whitespace-nowrap"><Price price={o.totals?.grandTotal} /></span></div>
                  </div>
                </div>

                {o.returnRequest?.status && (
                  <div>
                    <h3 className="font-semibold mb-1">Return</h3>
                    <div className="flex items-center gap-2 text-sm">
                      <Badge tone={toneForReturnStatus(o.returnRequest.status)}>Status: {o.returnRequest.status}</Badge>
                      {o.returnRequest?.requestedAt && (
                        <span className="opacity-70">requested {formatDate(o.returnRequest.requestedAt)}</span>
                      )}
                    </div>
                    {o.returnRequest?.reason && (
                      <div className="text-sm opacity-80 mt-1">Reason: {o.returnRequest.reason}</div>
                    )}
                  </div>
                )}

                {eligibleForReturn(o) && (
                  <div>
                    <button className="btn btn-outline w-full" onClick={() => openReturnModal(o)}>Request Return</button>
                  </div>
                )}

                {o.payment?.method === 'BANK' && (String(o.payment?.status || '').toUpperCase() !== 'PAID') && (
                  <div>
                    <label className="text-sm font-medium">Upload bank slip</label>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="block mt-1"
                      onChange={e => uploadSlip(o._id, e.target.files?.[0] || null)}
                      disabled={uploading === o._id}
                    />
                    {uploading === o._id && <div className="text-xs opacity-70 mt-1">Uploading…</div>}
                    {o.payment?.bank?.slipUrl && (
                      <a href={o.payment.bank.slipUrl} target="_blank" rel="noreferrer" className="text-xs underline mt-1 inline-block">View uploaded slip</a>
                    )}
                  </div>
                )}
              </aside>
            </div>

            {/* Mobile-only details: Delivery + Totals (collapsible) */}
            {expanded[o._id] && (
              <div className="p-4 md:hidden space-y-4">
                <div>
                  <h3 className="font-semibold mb-1">Delivery</h3>
                  <div className="text-sm">
                    <div>{o.address?.line1}{o.address?.line2 ? `, ${o.address.line2}` : ''}</div>
                    <div>{o.address?.city}{o.address?.region ? `, ${o.address.region}` : ''}</div>
                    <div>{o.address?.country}{o.address?.postalCode ? `, ${o.address.postalCode}` : ''}</div>
                    <div className="opacity-70 mt-1">Phone: {o.address?.phone}</div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Totals</h3>
                  <div className="text-sm">
                    <div className="flex justify-between"><span>Subtotal</span><span className="whitespace-nowrap"><Price price={o.totals?.subtotal} /></span></div>
                    <div className="flex justify-between"><span>Shipping</span><span className="whitespace-nowrap"><Price price={o.totals?.shipping} /></span></div>
                    <div className="flex justify-between font-semibold"><span>Total</span><span className="whitespace-nowrap"><Price price={o.totals?.grandTotal} /></span></div>
                  </div>
                </div>
                {o.returnRequest?.status && (
                  <div>
                    <h3 className="font-semibold mb-1">Return</h3>
                    <div className="flex items-center gap-2 text-sm">
                      <Badge tone={toneForReturnStatus(o.returnRequest.status)}>Status: {o.returnRequest.status}</Badge>
                      {o.returnRequest?.requestedAt && (
                        <span className="opacity-70">requested {formatDate(o.returnRequest.requestedAt)}</span>
                      )}
                    </div>
                    {o.returnRequest?.reason && (
                      <div className="text-sm opacity-80 mt-1">Reason: {o.returnRequest.reason}</div>
                    )}
                  </div>
                )}
                {o.payment?.method === 'BANK' && (String(o.payment?.status || '').toUpperCase() !== 'PAID') && (
                  <div>
                    <button className="btn btn-outline w-full" onClick={() => openReturnModal(o)}>Request Return</button>
                  </div>
                )}
                {o.payment?.method === 'BANK' && (String(o.payment?.status || '').toUpperCase() !== 'PAID') && (
                  <div>
                    <label className="text-sm font-medium">Upload bank slip</label>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="block mt-1"
                      onChange={e => uploadSlip(o._id, e.target.files?.[0] || null)}
                      disabled={uploading === o._id}
                    />
                    {uploading === o._id && <div className="text-xs opacity-70 mt-1">Uploading…</div>}
                    {o.payment?.bank?.slipUrl && (
                      <a href={o.payment.bank.slipUrl} target="_blank" rel="noreferrer" className="text-xs underline mt-1 inline-block">View uploaded slip</a>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Return Request Modal */}
      {returnOpen && returnFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/80" onClick={() => setReturnOpen(false)}></div>
          <div className="relative modal-solid rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-[--color-border]">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Request Return</h2>
              <div className="text-xs opacity-70">Order #{returnFor._id}</div>
            </div>
            <div className="p-6 space-y-4">
              <div className="text-sm opacity-80">
                <div><span className="font-medium">Total:</span> <Price price={returnFor.totals?.grandTotal} /></div>
                <div className="mt-1"><span className="font-medium">Delivered to:</span> {returnFor.address?.line1}{returnFor.address?.line2 ? `, ${returnFor.address.line2}` : ''}, {returnFor.address?.city}</div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Reason for return</label>
                <textarea rows={3} className="textarea w-full" value={retReason} onChange={e=>setRetReason(e.target.value)} placeholder="Describe the reason for return" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Upload photos (optional)</label>
                <input type="file" accept="image/*" multiple onChange={e=>setRetFiles(Array.from(e.target.files || []))} />
                {retFiles.length > 0 && (
                  <div className="text-xs opacity-70 mt-1">{retFiles.length} file(s) selected</div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Items to return</label>
                <div className="space-y-2">
                  {returnFor.items.map(it => {
                    const checked = retSel.includes(it.slug)
                    return (
                      <label key={it.slug} className="flex items-center justify-between gap-3 p-2 rounded border border-[--color-border] cursor-pointer">
                        <div className="min-w-0">
                          <div className="font-medium leading-tight truncate">{it.name}</div>
                          <div className="text-xs opacity-70">Ordered: {it.quantity}</div>
                        </div>
                        <input
                          type="checkbox"
                          className="checkbox"
                          checked={checked}
                          onChange={e => setRetSel(prev => e.target.checked ? [...prev, it.slug] : prev.filter(s => s !== it.slug))}
                        />
                      </label>
                    )
                  })}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t flex gap-3 justify-end">
              <button className="btn btn-ghost" onClick={() => setReturnOpen(false)} disabled={retSubmitting}>Cancel</button>
              <button className="btn btn-primary" onClick={submitReturn} disabled={retSubmitting}>
                {retSubmitting ? 'Submitting…' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
