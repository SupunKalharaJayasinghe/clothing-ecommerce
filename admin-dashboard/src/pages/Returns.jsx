import React, { useEffect, useState } from 'react'
import { api } from '../utils/http'

const statuses = ['', 'requested', 'approved', 'rejected', 'received', 'closed']

export default function ReturnsPage() {
  const [items, setItems] = useState([])
  const [auditItems, setAuditItems] = useState([])
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [viewMode, setViewMode] = useState('orders') // 'orders' or 'audits'

  // init form
  const [newOrderId, setNewOrderId] = useState('')
  const [reason, setReason] = useState('')
  const [creating, setCreating] = useState(false)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      if (viewMode === 'audits') {
        const res = await api.get('/admin/returns/audits', { params: { q, status: status || undefined } })
        setAuditItems(res.data.items)
      } else {
        const res = await api.get('/admin/returns', { params: { q, status: status || undefined } })
        setItems(res.data.items)
      }
    } catch (e) {
      setError(e.response?.data?.message || e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [viewMode])

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
          <select value={viewMode} onChange={e=>setViewMode(e.target.value)} className="input">
            <option value="orders">Orders View</option>
            <option value="audits">Audit Records</option>
          </select>
          <input placeholder="Search by order ID" value={q} onChange={e=>setQ(e.target.value)} className="input" />
          <select value={status} onChange={e=>setStatus(e.target.value)} className="input">
            {statuses.map(s => <option key={s} value={s}>{s || 'All statuses'}</option>)}
          </select>
          <button onClick={load} className="btn btn-primary">Filter</button>
        </div>
      </div>

      {error && <div className="text-red-500 text-sm mb-2">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {viewMode === 'orders' ? (
          <>
            <div className="lg:col-span-2">
              <table className="table">
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
                        <select value={o.returnRequest?.status || ''} onChange={e=>updateStatus(o._id, e.target.value)} className="input">
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
              <form onSubmit={initReturn} className="card p-3 text-sm">
                <label className="block text-xs mb-1">Order ID</label>
                <input className="w-full input mb-2" value={newOrderId} onChange={e=>setNewOrderId(e.target.value)} />
                <label className="block text-xs mb-1">Reason</label>
                <textarea className="w-full input mb-3" rows={3} value={reason} onChange={e=>setReason(e.target.value)} />
                <button disabled={creating} className="w-full btn btn-primary disabled:opacity-50">{creating ? 'Creating...' : 'Init return'}</button>
              </form>
            </div>
          </>
        ) : (
          <div className="lg:col-span-3">
            <table className="table w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border p-2 text-left">Return ID</th>
                  <th className="border p-2 text-left">Order ID</th>
                  <th className="border p-2 text-left">Status</th>
                  <th className="border p-2 text-left">Reason</th>
                  <th className="border p-2 text-left">Requested At</th>
                  <th className="border p-2 text-left">Updated At</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="p-4 text-center">Loading...</td></tr>
                ) : auditItems.length === 0 ? (
                  <tr><td colSpan="6" className="p-4 text-center">No audit records</td></tr>
                ) : auditItems.map(r => (
                  <tr key={r._id}>
                    <td className="border p-2 font-medium">{r._id}</td>
                    <td className="border p-2">{r.order?._id || r.order}</td>
                    <td className="border p-2">
                      <span className={`badge ${r.status === 'closed' ? 'badge-success' : r.status === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="border p-2 max-w-[200px] truncate" title={r.reason}>{r.reason || '-'}</td>
                    <td className="border p-2">{r.requestedAt ? new Date(r.requestedAt).toLocaleString() : '-'}</td>
                    <td className="border p-2">{r.updatedAt ? new Date(r.updatedAt).toLocaleString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}