import React, { useEffect, useState } from 'react'
import { api } from '../utils/http'

const statuses = ['', 'requested', 'approved', 'rejected', 'received', 'closed']

export default function ReturnsPage() {
  const [items, setItems] = useState([])
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // init form
  const [newOrderId, setNewOrderId] = useState('')
  const [reason, setReason] = useState('')
  const [creating, setCreating] = useState(false)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/admin/returns', { params: { q, status: status || undefined } })
      setItems(res.data.items)
    } catch (e) {
      setError(e.response?.data?.message || e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const initReturn = async (e) => {
    e.preventDefault()
    if (!newOrderId) return
    setCreating(true)
    try {
      await api.post(`/admin/returns/${newOrderId}/init`, { reason })
      setNewOrderId('')
      setReason('')
      await load()
    } catch (e) {
      alert(e.response?.data?.message || e.message)
    } finally {
      setCreating(false)
    }
  }

  const updateStatus = async (id, s) => {
    try {
      await api.patch(`/admin/returns/${id}/status`, { status: s })
      await load()
    } catch (e) {
      alert(e.response?.data?.message || e.message)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Returns</h1>
        <div className="flex gap-2">
          <input placeholder="Search by order ID" value={q} onChange={e=>setQ(e.target.value)} className="border px-2 py-1 rounded" />
          <select value={status} onChange={e=>setStatus(e.target.value)} className="border px-2 py-1 rounded">
            {statuses.map(s => <option key={s} value={s}>{s || 'All statuses'}</option>)}
          </select>
          <button onClick={load} className="bg-black text-white px-3 py-1 rounded">Filter</button>
        </div>
      </div>

      {error && <div className="text-red-500 text-sm mb-2">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <table className="w-full border text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="border p-2 text-left">Order</th>
                <th className="border p-2 text-left">Return status</th>
                <th className="border p-2 text-left">Reason</th>
                <th className="border p-2 text-left">Updated</th>
                <th className="border p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" className="p-4 text-center">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan="5" className="p-4 text-center">No returns</td></tr>
              ) : items.map(o => (
                <tr key={o._id}>
                  <td className="border p-2">
                    <div className="font-medium">{o._id}</div>
                    <div className="text-xs text-gray-500">{new Date(o.createdAt).toLocaleString()}</div>
                  </td>
                  <td className="border p-2">
                    <select value={o.returnRequest?.status || ''} onChange={e=>updateStatus(o._id, e.target.value)} className="border px-2 py-1 rounded">
                      {statuses.slice(1).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="border p-2 max-w-[300px] truncate" title={o.returnRequest?.reason}>{o.returnRequest?.reason}</td>
                  <td className="border p-2">{o.returnRequest?.updatedAt ? new Date(o.returnRequest.updatedAt).toLocaleString() : '-'}</td>
                  <td className="border p-2 text-center">—</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <h2 className="font-semibold mb-2">Init a return</h2>
          <form onSubmit={initReturn} className="border rounded p-3 text-sm">
            <label className="block text-xs mb-1">Order ID</label>
            <input className="w-full border px-2 py-1 rounded mb-2" value={newOrderId} onChange={e=>setNewOrderId(e.target.value)} />
            <label className="block text-xs mb-1">Reason</label>
            <textarea className="w-full border px-2 py-1 rounded mb-3" rows={3} value={reason} onChange={e=>setReason(e.target.value)} />
            <button disabled={creating} className="w-full bg-black text-white py-1.5 rounded disabled:opacity-50">{creating ? 'Creating...' : 'Init return'}</button>
          </form>
        </div>
      </div>
    </div>
  )
}