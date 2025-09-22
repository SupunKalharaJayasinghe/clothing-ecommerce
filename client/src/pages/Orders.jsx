import { useEffect, useState } from 'react'
import { useAppSelector } from '../app/hooks'
import api from '../lib/axios'
import Price from '../components/ui/Price'
import Badge from '../components/ui/Badge'

export default function Orders() {
  const { user } = useAppSelector(s => s.auth)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [orders, setOrders] = useState([])
  const [uploading, setUploading] = useState('') // orderId currently uploading slip

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

  if (loading) return <div className="container-app section">Loading orders…</div>
  if (error) return <div className="container-app section text-red-600">{error}</div>

  return (
    <div className="container-app section">
      <h1 className="section-title">Your Orders</h1>
      {orders.length === 0 && (
        <div className="mt-3 card card-body max-w-md">
          <div className="text-sm opacity-80">You have no orders yet.</div>
        </div>
      )}

      <div className="mt-8 space-y-5">
        {orders.map(o => (
          <div key={o._id} className="card">
            <div className="p-4 border-b flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="text-xs opacity-60">Order</div>
                <div className="font-medium text-sm">#{o._id}</div>
                <div className="text-xs opacity-70 mt-0.5">{new Date(o.createdAt).toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-2">
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
              </div>
            </div>

            <div className="p-4 grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
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

                {o.payment?.method === 'BANK' && o.payment?.status !== 'paid' && (
                  <div>
                    <label className="text-sm">Upload bank slip</label>
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
