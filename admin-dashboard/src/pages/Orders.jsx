import React, { useEffect, useMemo, useState } from 'react'
import { api } from '../utils/http'

// Clean status sets for Admin
const filterStatuses = [
  '',
  'CONFIRMED','PACKING','SHIPPED','OUT_FOR_DELIVERY','DELIVERED','CANCELLED','RETURNED'
]

export default function OrdersPage() {
  const [items, setItems] = useState([])
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Delivery agents for assignment
  const [agents, setAgents] = useState([])

  // Handover assignment overlay state
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignFor, setAssignFor] = useState('')
  const [assignAgent, setAssignAgent] = useState('')

  // Create Order form state (always visible on the right column)
  const [form, setForm] = useState({
    userId: '',
    method: 'COD',
    items: [{ slug: '', quantity: 1 }],
    useDefault: true,
    address: { line1: '', city: '', country: 'Sri Lanka', phone: '' }
  })

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/admin/orders', { params: { q, status: status || undefined } })
      setItems(res.data.items)
    } catch (e) {
      setError(e.response?.data?.message || e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])
  const loadAgentsList = async () => {
    try {
      const res = await api.get('/admin/delivery', { params: { limit: 100 } })
      setAgents(res.data.items || [])
    } catch (e) {
      // surface error so user knows why list is empty
      alert(e.response?.data?.message || e.message)
      setAgents([])
    }
  }
  useEffect(() => { loadAgentsList() }, [])

  const updateStatus = async (id, next) => {
    try {
      // Collect extra fields when required by server rules
      const payload = { status: next }
      if (next === 'dispatched') {
        const scanRef = prompt('Enter dispatch scan reference (or leave empty to attach a photo URL next):') || ''
        const photoUrl = scanRef ? '' : (prompt('Enter dispatch photo URL (optional):') || '')
        payload.evidence = {}
        if (scanRef) payload.evidence.scanRef = scanRef
        if (photoUrl) payload.evidence.photoUrl = photoUrl
      }
      if (['attempted','failed','exception','return_to_sender'].includes(next)) {
        const reason = prompt(`Enter reason for ${next.toUpperCase()}: (e.g., NO_ANSWER / address issue)`)
        if (reason) payload.reason = { detail: reason }
      }
      if (next === 'delivered') {
        const pod = prompt('Enter POD evidence: OTP code OR a photo/signature URL. If OTP, type the code; otherwise paste a URL.') || ''
        payload.evidence = {}
        if (/^\d{4,6}$/.test(pod)) payload.evidence.otp = pod
        else if (pod) payload.evidence.podPhotoUrl = pod
      }
      await api.patch(`/admin/orders/${id}/status`, payload)
      await load()
    } catch (e) {
      alert(e.response?.data?.message || e.message)
    }
  }

  const verifyBank = async (id) => {
    try {
      await api.post(`/admin/payments/bank/${id}/verify`)
      await load()
    } catch (e) {
      alert(e.response?.data?.message || e.message)
    }
  }

  // Inline status dropdown handler (placed | packed | dispatched)
  const setStatusInline = async (id, value) => {
    if (value === 'dispatched') {
      await loadAgentsList()
      setAssignFor(id)
      setAssignOpen(true)
      return
    }
    try {
      await api.patch(`/admin/orders/${id}/status`, { status: value })
      await load()
    } catch (e) {
      alert(e.response?.data?.message || e.message)
    }
  }

  const submitAssign = async () => {
    if (!assignFor) return
    if (!assignAgent) {
      alert('Please select a delivery person.')
      return
    }
    const payload = { status: 'dispatched', assignDeliveryId: assignAgent }
    try {
      await api.patch(`/admin/orders/${assignFor}/status`, payload)
      setAssignOpen(false)
      setAssignFor('')
      setAssignAgent('')
      await load()
    } catch (e) {
      alert(e.response?.data?.message || e.message)
    }
  }

  const deleteOrder = async (id) => {
    if (!confirm('Delete this order? This will restore stock if not handed over to delivery.')) return
    try {
      await api.delete(`/admin/orders/${id}`)
      await load()
    } catch (e) {
      alert(e.response?.data?.message || e.message)
    }
  }

  const addItemRow = () => setForm(f => ({ ...f, items: [...f.items, { slug: '', quantity: 1 }] }))
  const removeItemRow = (i) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))

  const createOrder = async (e) => {
    e?.preventDefault?.()
    try {
      const payload = {
        userId: form.userId.trim(),
        method: form.method,
        items: form.items.filter(it => it.slug.trim()).map(it => ({ slug: it.slug.trim(), quantity: Number(it.quantity) || 1 }))
      }
      if (!form.useDefault) {
        payload.address = {
          line1: form.address.line1.trim(),
          city: form.address.city.trim(),
          country: form.address.country.trim(),
          phone: form.address.phone.trim()
        }
      }
      await api.post('/admin/orders', payload)
      alert('Order created')
      setForm({ userId: '', method: 'COD', items: [{ slug: '', quantity: 1 }], useDefault: true, address: { line1: '', city: '', country: 'Sri Lanka', phone: '' } })
      setCreateOpen(false)
      await load()
    } catch (e) {
      alert(e.response?.data?.message || e.message)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Orders</h1>
        <div className="flex gap-2">
          <input placeholder="Search by ID, user, product..." value={q} onChange={e=>setQ(e.target.value)} className="input" />
          <select value={status} onChange={e=>setStatus(e.target.value)} className="input">
            {filterStatuses.map(s => <option key={s} value={s}>{s || 'All statuses'}</option>)}
          </select>
          <button onClick={load} className="btn btn-primary">Filter</button>
        </div>
      </div>


      {error && <div className="text-red-500 text-sm mb-2">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table modern-table min-w-full">
            <thead>
              <tr>
                <th className="border p-2 text-left whitespace-nowrap">Order</th>
                <th className="border p-2 text-left whitespace-nowrap">Method</th>
                <th className="border p-2 text-left whitespace-nowrap">Payment</th>
                <th className="border p-2 text-left whitespace-nowrap">Status</th>
                <th className="border p-2 text-left whitespace-nowrap">Courier</th>
                <th className="border p-2 text-right whitespace-nowrap">Total</th>
                <th className="border p-2 text-center whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="p-4 text-center">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan="6" className="p-4 text-center">No orders</td></tr>
              ) : items.map(o => {
                const method = String(o.payment?.method || '').toUpperCase()
                const pay = String(o.payment?.status || '').toUpperCase()
                const state = String(o.orderState || o.status || '').toUpperCase()
                const total = Number(o.totals?.grandTotal ?? 0)
                return (
                  <tr key={o._id}>
                    <td className="border p-2 align-top">
                      <div className="font-medium leading-tight break-all">{o._id}</div>
                      <div className="text-xs text-[color:var(--ink-muted)]">{new Date(o.createdAt).toLocaleString()}</div>
                    </td>
                    <td className="border p-2 align-top whitespace-nowrap">{method || '-'}</td>
                    <td className="border p-2 align-top whitespace-nowrap">{pay || '-'}</td>
                    <td className="border p-2 align-top whitespace-nowrap">
                      <select className="input" value={state === 'PACKING' ? 'packed' : state === 'SHIPPED' ? 'dispatched' : 'placed'} onChange={e=>setStatusInline(o._id, e.target.value)}>
                        <option value="placed">placed</option>
                        <option value="packed">packed</option>
                        <option value="dispatched">handover</option>
                      </select>
                    </td>
                    <td className="border p-2 align-top whitespace-nowrap">
                      {o.assignedDelivery ? (
                        <span>{(o.assignedDelivery.firstName || '') + ' ' + (o.assignedDelivery.lastName || '')}</span>
                      ) : '—'}
                    </td>
                    <td className="border p-2 align-top text-right whitespace-nowrap">{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="border p-2 align-top text-center">
                      <button className="btn btn-danger btn-sm" title="Delete order" onClick={() => deleteOrder(o._id)}>Delete</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
              </table>
            </div>
          </div>
        </div>
        <div>
          <form onSubmit={createOrder} className="card">
            <div className="card-header font-semibold">Create Order</div>
            <div className="card-body grid gap-4 grid-cols-1 md:grid-cols-2">
              <div>
                <label className="label">User ID</label>
                <input className="input w-full" value={form.userId} onChange={e=>setForm(f=>({...f, userId:e.target.value}))} required />
              </div>
              <div>
                <label className="label">Payment Method</label>
                <select className="input w-full" value={form.method} onChange={e=>setForm(f=>({...f, method:e.target.value}))}>
                  <option>COD</option>
                  <option>CARD</option>
                  <option>BANK</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="label">Items</label>
                {form.items.map((it, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <input className="input flex-1" placeholder="slug" value={it.slug} onChange={e=>setForm(f=>{const items=[...f.items];items[idx]={...items[idx], slug:e.target.value};return {...f, items}})} />
                    <input className="input w-24" type="number" min="1" value={it.quantity} onChange={e=>setForm(f=>{const items=[...f.items];items[idx]={...items[idx], quantity:e.target.value};return {...f, items}})} />
                    <button type="button" className="btn btn-ghost btn-sm" onClick={()=>removeItemRow(idx)}>Remove</button>
                  </div>
                ))}
                <button type="button" className="btn btn-ghost btn-sm" onClick={addItemRow}>+ Add item</button>
              </div>

              <div className="md:col-span-2">
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={form.useDefault} onChange={e=>setForm(f=>({...f, useDefault:e.target.checked}))} />
                  <span>Use user's default address</span>
                </label>
              </div>

              {!form.useDefault && (
                <>
                  <div>
                    <label className="label">Address line 1</label>
                    <input className="input w-full" value={form.address.line1} onChange={e=>setForm(f=>({...f, address:{...f.address, line1:e.target.value}}))} required={!form.useDefault} />
                  </div>
                  <div>
                    <label className="label">City</label>
                    <input className="input w-full" value={form.address.city} onChange={e=>setForm(f=>({...f, address:{...f.address, city:e.target.value}}))} required={!form.useDefault} />
                  </div>
                  <div>
                    <label className="label">Country</label>
                    <input className="input w-full" value={form.address.country} onChange={e=>setForm(f=>({...f, address:{...f.address, country:e.target.value}}))} required={!form.useDefault} />
                  </div>
                  <div>
                    <label className="label">Phone</label>
                    <input className="input w-full" value={form.address.phone} onChange={e=>setForm(f=>({...f, address:{...f.address, phone:e.target.value}}))} required={!form.useDefault} />
                  </div>
                </>
              )}
            </div>
            <div className="card-footer flex justify-end gap-2">
              <button type="submit" className="btn btn-primary">Create</button>
            </div>
          </form>
        </div>
      </div>

      {assignOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 grid place-items-center p-4" onClick={()=>setAssignOpen(false)}>
          <div className="card w-full max-w-md" onClick={e=>e.stopPropagation()}>
            <div className="card-header font-semibold">Handover assignment</div>
            <div className="card-body grid gap-3">
              <div>
                <label className="label">Delivery person</label>
                <select className="input w-full" value={assignAgent} onChange={e=>setAssignAgent(e.target.value)}>
                  <option value="">— Select delivery person —</option>
                  {agents.map(a => (
                    <option key={a.id} value={a.id}>{a.fullName || a.phone || a.email || a.id}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="card-footer flex justify-end gap-2">
              <button className="btn" onClick={()=>setAssignOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={submitAssign}>Handover</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}