import React, { useEffect, useMemo, useState } from 'react'
import { api } from '../utils/http'

const statuses = ['pending_payment','placed','packing','handed_over','out_for_delivery','payment_confirm','delivery_confirm','delivery_confirm_bank','completed']

export default function OrdersPage() {
  const [items, setItems] = useState([])
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

  const updateStatus = async (id, next) => {
    try {
      await api.patch(`/admin/orders/${id}/status`, { status: next })
      await load()
    } catch (e) {
      alert(e.response?.data?.message || e.message)
    }
  }

  const verifyBank = async (id) => {
    try {
      await api.post(`/admin/orders/${id}/payments/bank/verify`)
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
            <option value="">All statuses</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={load} className="btn btn-primary">Filter</button>
        </div>
      </div>

      {error && <div className="text-red-500 text-sm mb-2">{error}</div>}

      <div className="overflow-x-auto">
        <table className="table">
          <thead className="bg-gray-50">
            <tr>
              <th className="border p-2 text-left">Order</th>
              <th className="border p-2 text-left">Method</th>
              <th className="border p-2 text-left">Payment</th>
              <th className="border p-2 text-left">Status</th>
              <th className="border p-2 text-left">Total</th>
              <th className="border p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="p-4 text-center">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan="6" className="p-4 text-center">No orders</td></tr>
            ) : items.map(o => (
              <tr key={o._id}>
                <td className="border p-2">
                  <div className="font-medium">{o._id}</div>
                  <div className="text-xs text-gray-500">{new Date(o.createdAt).toLocaleString()}</div>
                </td>
                <td className="border p-2">{o.payment?.method}</td>
                <td className="border p-2">{o.payment?.status}</td>
                <td className="border p-2">
                  <select value={o.status} onChange={e => updateStatus(o._id, e.target.value)} className="input">
                    {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="border p-2">{o.totals?.grandTotal?.toFixed?.(2) ?? o.totals?.grandTotal}</td>
                <td className="border p-2 text-center">—</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}