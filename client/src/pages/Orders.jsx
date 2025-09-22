import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppSelector } from '../app/hooks'
import api from '../lib/axios'
import Price from '../components/ui/Price'
import Badge from '../components/ui/Badge'
import Loader from '../components/ui/Loader'
import { ChevronDown, ChevronUp, Copy } from '../lib/icons'

export default function Orders() {
  const { user } = useAppSelector(s => s.auth)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [orders, setOrders] = useState([])
  const [uploading, setUploading] = useState('') // orderId currently uploading slip
  const [expanded, setExpanded] = useState({}) // map of orderId => bool (mobile only)

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
            <div className="p-4 border-b flex items-start justify-between gap-3 flex-wrap">
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
              <div className="flex items-center gap-2 flex-wrap">
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
                <div className="ml-2 font-semibold whitespace-nowrap">Total: <Price price={o.totals?.grandTotal} /></div>

                {/* Mobile toggle */}
                <button
                  className="md:hidden ml-2 px-2 py-1 rounded border text-sm"
                  onClick={() => setExpanded(prev => ({ ...prev, [o._id]: !prev[o._id] }))}
                  aria-expanded={!!expanded[o._id]}
                  aria-controls={`order-details-${o._id}`}
                >
                  {expanded[o._id] ? (<span className="inline-flex items-center gap-1">Hide <ChevronUp /></span>) : (<span className="inline-flex items-center gap-1">Details <ChevronDown /></span>)}
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
              )}

              <aside className="space-y-3">
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
                    <div className="flex justify-between"><span>Subtotal</span><span><Price price={o.totals?.subtotal} /></span></div>
                    <div className="flex justify-between"><span>Shipping</span><span><Price price={o.totals?.shipping} /></span></div>
                    <div className="flex justify-between font-semibold"><span>Total</span><span><Price price={o.totals?.grandTotal} /></span></div>
                  </div>
                </div>

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
          </div>
        ))}
      </div>
    </div>
  )
}
