import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppSelector } from '../app/hooks'
import api from '../lib/axios'
import Price from '../components/ui/Price'
import Badge from '../components/ui/Badge'

export default function Orders() {
  const { user } = useAppSelector(s => s.auth)
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [orders, setOrders] = useState([])
  const [uploading, setUploading] = useState('') // orderId currently uploading slip

  useEffect(() => {
    if (!user) navigate('/login?next=' + encodeURIComponent('/orders'))
  }, [user, navigate])

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

  function statusTone(s) {
    if (s === 'placed') return 'blue'
    if (s === 'completed') return 'green'
    if (s?.includes('delivery')) return 'amber'
    return 'gray'
  }

  if (loading) return <div className="container-app section">Loading orders…</div>
  if (error) return <div className="container-app section text-red-600">{error}</div>

  return (
    <div className="container-app section">
      <h1 className="section-title">Your Orders</h1>
      {orders.length === 0 && <div className="mt-3 opacity-70">You have no orders yet.</div>}

      <div className="mt-8 space-y-4">
        {orders.map(o => (
          <div key={o._id} className="card p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="text-sm opacity-70">#{o._id}</div>
              <div className="flex items-center gap-2">
                <Badge tone={statusTone(o.status)}>{o.status}</Badge>
                <Badge>{o.payment?.method}</Badge>
                {o.payment?.status && <Badge tone={o.payment.status === 'paid' ? 'green' : (o.payment.status === 'failed' ? 'red' : 'gray')}>{o.payment.status}</Badge>}
              </div>
            </div>

            <div className="text-sm opacity-70 mt-1">{new Date(o.createdAt).toLocaleString()}</div>

            <div className="grid md:grid-cols-3 gap-4 mt-3">
              <div className="md:col-span-2">
                <h3 className="font-semibold mb-2">Items</h3>
                <div className="space-y-2">
                  {o.items.map(it => (
                    <div key={it.slug} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {it.image && <img src={it.image} alt={it.name} className="w-10 h-12 object-cover rounded border" />}
                        <div>
                          <div className="font-medium leading-tight">{it.name}</div>
                          <div className="opacity-70">{it.color} × {it.quantity}</div>
                        </div>
                      </div>
                      <div className="font-medium"><Price price={it.price * it.quantity} /></div>
                    </div>
                  ))}
                </div>
              </div>

              <aside>
                <h3 className="font-semibold mb-2">Delivery</h3>
                <div className="text-sm">
                  <div>{o.address?.line1}{o.address?.line2 ? `, ${o.address.line2}` : ''}</div>
                  <div>{o.address?.city}{o.address?.region ? `, ${o.address.region}` : ''}</div>
                  <div>{o.address?.country}{o.address?.postalCode ? `, ${o.address.postalCode}` : ''}</div>
                  <div className="opacity-70 mt-1">Phone: {o.address?.phone}</div>
                </div>

                <h3 className="font-semibold mt-4 mb-1">Totals</h3>
                <div className="text-sm">
                  <div className="flex justify-between"><span>Subtotal</span><span><Price price={o.totals?.subtotal} /></span></div>
                  <div className="flex justify-between"><span>Shipping</span><span><Price price={o.totals?.shipping} /></span></div>
                  <div className="flex justify-between font-semibold"><span>Total</span><span><Price price={o.totals?.grandTotal} /></span></div>
                </div>

                {o.payment?.method === 'BANK' && o.payment?.status !== 'paid' && (
                  <div className="mt-3">
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
