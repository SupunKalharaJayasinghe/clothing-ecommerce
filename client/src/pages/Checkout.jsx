import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import api from '../lib/axios'
import { clearCart } from '../features/cart/cartSlice'

function Price({ v }) { return <span>Rs. {Number(v || 0).toLocaleString()}</span> }

export default function Checkout() {
  const { items } = useAppSelector(s => s.cart)
  const { user } = useAppSelector(s => s.auth)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const [method, setMethod] = useState('COD') // 'COD' | 'CARD' | 'BANK'
  const [addr, setAddr] = useState({ line1: '', line2: '', city: '', region: '', postalCode: '', country: 'Sri Lanka', phone: '' })
  const [addresses, setAddresses] = useState([])
  const [addressId, setAddressId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [slip, setSlip] = useState(null) // bank
  const [preview, setPreview] = useState(null) // for CARD two-step { items, totals, address }

  const totals = useMemo(() => {
    const subtotal = items.reduce((s, it) => s + it.price * it.quantity, 0)
    return { subtotal, shipping: 0, discount: 0, grand: subtotal }
  }, [items])

  // Route-level protection handles redirects
  useEffect(() => {}, [user])

  // Load saved addresses for convenience
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/account/addresses')
        const list = Array.isArray(data.items) ? data.items.slice() : []
        // Sort with default first, then by created order
        list.sort((a,b) => (b.isDefault === true) - (a.isDefault === true))
        setAddresses(list)
        const def = list.find(a => a.isDefault) || list[0]
        if (def) setAddressId(def._id)
      } catch {}
    })()
  }, [])

  if (items.length === 0) {
    return (
      <div className="container-app section max-w-4xl text-center">
        <h1 className="text-2xl font-bold mb-2">Your cart is empty</h1>
      </div>
    )
  }

  async function place() {
    setLoading(true); setError('')
    try {
      const hasTypedAddress = addr.line1.trim() && addr.city.trim() && addr.country.trim() && addr.phone.trim()
      const payload = {
        method,
        ...(hasTypedAddress
          ? { address: { ...addr, line1: addr.line1.trim(), city: addr.city.trim(), country: addr.country.trim(), phone: addr.phone.trim() } }
          : { addressId: addressId || undefined }),
        items: items.map(i => ({ slug: i.slug, quantity: i.quantity }))
      }
      // For CARD: request preview first; backend may return requiresConfirmation
      const { data } = await api.post('/orders', payload)
      if (method === 'CARD' && data?.requiresConfirmation && data.preview) {
        setPreview(data.preview)
        setLoading(false)
        return
      }
      const orderId = data.orderId

      // BANK: upload slip immediately if provided
      if (method === 'BANK' && slip) {
        const form = new FormData()
        form.append('slip', slip)
        await api.post(`/payments/bank/${orderId}/slip`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
      }

      // CARD: if backend returned PayHere form params (sandbox), auto-submit a form
      if (method === 'CARD' && data.payhere?.action) {
        const form = document.createElement('form')
        form.method = 'POST'
        form.action = data.payhere.action
        for (const [k, v] of Object.entries(data.payhere.params || {})) {
          const input = document.createElement('input')
          input.type = 'hidden'
    
          input.name = k === 'md5sig' ? 'hash' : k
          input.value = v
          form.appendChild(input)
        }
        document.body.appendChild(form)
        form.submit()
        // Do not clear the cart here for CARD; only clear after confirmed payment
        return
      }

      // If we expected CARD redirect but didn't receive gateway params, show an error (do not navigate)
      if (method === 'CARD') {
        setError('Unable to initiate card payment. Please try again.')
        setLoading(false)
        return
      }

      dispatch(clearCart())
      navigate('/orders')
    } catch (e) {
      setError(e.response?.data?.message || e.message)
    } finally {
      setLoading(false)
    }
  }

  async function confirmPlace() {
    if (!preview) return
    setLoading(true); setError('')
    try {
      const hasTypedAddress = addr.line1.trim() && addr.city.trim() && addr.country.trim() && addr.phone.trim()
      const payload = {
        method,
        confirm: true,
        ...(hasTypedAddress
          ? { address: { ...addr, line1: addr.line1.trim(), city: addr.city.trim(), country: addr.country.trim(), phone: addr.phone.trim() } }
          : { addressId: addressId || undefined }),
        items: items.map(i => ({ slug: i.slug, quantity: i.quantity }))
      }
      const { data } = await api.post('/orders', payload)
      const orderId = data.orderId

      if (method === 'CARD' && data.payhere?.action) {
        const form = document.createElement('form')
        form.method = 'POST'
        form.action = data.payhere.action
        for (const [k, v] of Object.entries(data.payhere.params || {})) {
          const input = document.createElement('input')
          input.type = 'hidden'
          input.name = k === 'md5sig' ? 'hash' : k
          input.value = v
          form.appendChild(input)
        }
        document.body.appendChild(form)
        form.submit()
        // Do not clear the cart here for CARD; only clear after confirmed payment
        return
      }

      // If we expected CARD redirect but didn't receive gateway params, show an error (do not navigate)
      if (method === 'CARD') {
        setError('Unable to initiate card payment. Please try again.')
        setLoading(false)
        return
      }

      // BANK: upload slip immediately if provided
      if (method === 'BANK' && slip) {
        const form = new FormData()
        form.append('slip', slip)
        await api.post(`/payments/bank/${orderId}/slip`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
      }

      dispatch(clearCart())
      navigate('/orders')
    } catch (e) {
      setError(e.response?.data?.message || e.message)
    } finally {
      setLoading(false)
      setPreview(null)
    }
  }

  return (
    <div className="container-app section max-w-5xl">
      <h1 className="section-title">Checkout</h1>

      <div className="grid md:grid-cols-3 gap-6 mt-6">
        {/* Address */}
        <section className="md:col-span-2 space-y-3">
          <div className="card">
            <div className="card-body">
            <h2 className="font-semibold mb-2">Delivery address</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input className="input" placeholder="Line 1 *" value={addr.line1} onChange={e => setAddr(a => ({ ...a, line1: e.target.value }))} />
              <input className="input" placeholder="Line 2" value={addr.line2} onChange={e => setAddr(a => ({ ...a, line2: e.target.value }))} />
              <input className="input" placeholder="City *" value={addr.city} onChange={e => setAddr(a => ({ ...a, city: e.target.value }))} />
              <input className="input" placeholder="Region" value={addr.region} onChange={e => setAddr(a => ({ ...a, region: e.target.value }))} />
              <input className="input" placeholder="Postal Code" value={addr.postalCode} onChange={e => setAddr(a => ({ ...a, postalCode: e.target.value }))} />
              <input className="input" placeholder="Country *" value={addr.country} onChange={e => setAddr(a => ({ ...a, country: e.target.value }))} />
              <input className="input" placeholder="Phone *" value={addr.phone} onChange={e => setAddr(a => ({ ...a, phone: e.target.value }))} />
            </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
            <h2 className="font-semibold mb-2">Payment method</h2>
            <div className="flex gap-3">
              {['COD','CARD','BANK'].map(m => (
                <button
                  key={m}
                  className={`btn ${method === m ? 'btn-primary' : 'btn-outline'} px-3 py-1`}
                  onClick={() => setMethod(m)}
                >{m}</button>
              ))}
            </div>

            {method === 'BANK' && (
              <div className="mt-3">
                <label className="text-sm block mb-1">Upload bank slip (image)</label>
                <input type="file" accept="image/*,application/pdf" onChange={e => setSlip(e.target.files?.[0] || null)} />
                <p className="text-xs opacity-70 mt-1">You can also upload later from your orders page.</p>
              </div>
            )}
            {method === 'CARD' && (
              <p className="text-sm opacity-80 mt-2">
                You’ll be redirected to the PayHere (sandbox) checkout. Be sure to set your PayHere env values for real payments.
              </p>
            )}
            </div>
          </div>

          {error && <div className="text-red-600">{error}</div>}

          {/* CARD: Confirmation preview step */}
          {preview && method === 'CARD' ? (
            <div className="card border-amber-300">
              <div className="card-body">
                <h3 className="font-semibold mb-2">Confirm your order</h3>
                <div className="grid md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="font-medium mb-1">Items</div>
                    <div className="space-y-1">
                      {(preview.items || []).map((it, idx) => (
                        <div key={idx} className="flex justify-between">
                          <div className="truncate mr-2">{it.name} × {it.quantity}</div>
                          <div><Price v={(it.price || 0) * (it.quantity || 0)} /></div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium mb-1">Delivery</div>
                    <div className="opacity-80">
                      {preview.address?.line1}, {preview.address?.city}, {preview.address?.country}
                      {preview.address?.phone ? ` — ${preview.address?.phone}` : ''}
                    </div>
                    <div className="mt-3">
                      <div className="flex justify-between"><span>Subtotal</span><span><Price v={preview.totals?.subtotal} /></span></div>
                      <div className="flex justify-between"><span>Shipping</span><span>Free</span></div>
                      <div className="flex justify-between font-semibold mt-1"><span>Total</span><span><Price v={preview.totals?.grandTotal ?? preview.totals?.grand} /></span></div>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button className="btn btn-primary" onClick={confirmPlace} disabled={loading}>
                    {loading ? 'Processing…' : 'Confirm & Pay'}
                  </button>
                  <button className="btn btn-outline" onClick={() => setPreview(null)} disabled={loading}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button className="btn btn-primary" onClick={place} disabled={loading}>
              {loading ? 'Placing…' : 'Place order'}
            </button>
          )}
        </section>

        {/* Summary */}
        <aside className="card h-max">
          <div className="card-body">
          <h2 className="font-semibold mb-3">Order summary</h2>
          {/* Saved addresses selector */}
          <div className="mb-3">
            <label className="text-sm font-medium">Use saved address</label>
            <select
              className="mt-1 w-full select"
              value={addressId}
              onChange={e => setAddressId(e.target.value)}
            >
              <option value="">— None — (fill the form)</option>
              {addresses.map(a => (
                <option key={a._id} value={a._id}>
                  {(a.label || 'Address') + ' — ' + a.line1 + ', ' + a.city}
                  {a.isDefault ? ' (default)' : ''}
                </option>
              ))}
            </select>
            <p className="text-xs opacity-70 mt-1">If you leave the form empty, we'll use the selected saved address.</p>
          </div>
          <div className="space-y-2 max-h-[18rem] overflow-auto">
            {items.map(it => (
              <div key={it.slug} className="flex justify-between text-sm">
                <div className="truncate mr-2">{it.name} × {it.quantity}</div>
                <div><Price v={it.price * it.quantity} /></div>
              </div>
            ))}
          </div>
          <hr className="my-3" />
          <div className="flex justify-between text-sm"><span>Subtotal</span><span><Price v={totals.subtotal} /></span></div>
          <div className="flex justify-between text-sm"><span>Shipping</span><span>Free</span></div>
          <div className="flex justify-between font-semibold mt-2"><span>Total</span><span><Price v={totals.grand} /></span></div>
          </div>
        </aside>
      </div>
    </div>
  )
}
