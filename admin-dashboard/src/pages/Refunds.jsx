import React, { useEffect, useState } from 'react'
import { api } from '../utils/http'

const methods = ['', 'BANK', 'CARD', 'COD']
const statuses = ['', 'refunded', 'paid', 'failed', 'pending', 'initiated']

export default function RefundsPage() {
  const [items, setItems] = useState([])
  const [auditItems, setAuditItems] = useState([])
  const [q, setQ] = useState('')
  const [method, setMethod] = useState('')
  const [status, setStatus] = useState('refunded')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [viewMode, setViewMode] = useState('orders') // 'orders' or 'audits'

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      if (viewMode === 'audits') {
        const res = await api.get('/admin/refunds/audits', { params: { q, method: method || undefined, status: status || undefined } })
        setAuditItems(res.data.items)
      } else {
        const res = await api.get('/admin/refunds', { params: { q, method: method || undefined, status: status || undefined } })
        setItems(res.data.items)
      }
    } catch (e) {
      setError(e.response?.data?.message || e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [viewMode])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Refunds</h1>
        <div className="flex gap-2">
          <select value={viewMode} onChange={e=>setViewMode(e.target.value)} className="input">
            <option value="orders">Orders View</option>
            <option value="audits">Audit Records</option>
          </select>
          <input placeholder="Search by order ID or product" value={q} onChange={e=>setQ(e.target.value)} className="input" />
          <select value={method} onChange={e=>setMethod(e.target.value)} className="input">
            {methods.map(m => <option key={m} value={m}>{m || 'All methods'}</option>)}
          </select>
          <select value={status} onChange={e=>setStatus(e.target.value)} className="input">
            {statuses.map(s => <option key={s} value={s}>{s || 'All statuses'}</option>)}
          </select>
          <button onClick={load} className="btn btn-primary">Filter</button>
        </div>
      </div>

      {error && <div className="text-red-500 text-sm mb-2">{error}</div>}

      <div className="overflow-x-auto">
        {viewMode === 'orders' ? (
          <table className="table">
            <thead className="bg-gray-50">
              <tr>
                <th className="border p-2 text-left">Order</th>
                <th className="border p-2 text-left">Method</th>
                <th className="border p-2 text-left">Payment Status</th>
                <th className="border p-2 text-left">Amount</th>
                <th className="border p-2 text-left">Updated</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" className="p-4 text-center">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan="5" className="p-4 text-center">No refunds</td></tr>
              ) : items.map(o => (
                <tr key={o._id}>
                  <td className="border p-2">
                    <div className="font-medium">{o._id}</div>
                    <div className="text-xs text-gray-500">{new Date(o.createdAt).toLocaleString()}</div>
                  </td>
                  <td className="border p-2">{o.payment?.method}</td>
                  <td className="border p-2">
                    <span className={`badge ${o.payment?.status === 'REFUNDED' ? 'badge-success' : 'badge-warning'}`}>
                      {o.payment?.status}
                    </span>
                  </td>
                  <td className="border p-2">Rs. {o.totals?.grandTotal || 0}</td>
                  <td className="border p-2">{new Date(o.updatedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="table">
            <thead className="bg-gray-50">
              <tr>
                <th className="border p-2 text-left">Refund ID</th>
                <th className="border p-2 text-left">Order ID</th>
                <th className="border p-2 text-left">Method</th>
                <th className="border p-2 text-left">Status</th>
                <th className="border p-2 text-left">Amount</th>
                <th className="border p-2 text-left">Notes</th>
                <th className="border p-2 text-left">Processed At</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="p-4 text-center">Loading...</td></tr>
              ) : auditItems.length === 0 ? (
                <tr><td colSpan="7" className="p-4 text-center">No audit records</td></tr>
              ) : auditItems.map(r => (
                <tr key={r._id}>
                  <td className="border p-2 font-medium">{r._id}</td>
                  <td className="border p-2">{r.order?._id || r.order}</td>
                  <td className="border p-2">{r.method}</td>
                  <td className="border p-2">
                    <span className={`badge ${r.status === 'PROCESSED' ? 'badge-success' : r.status === 'FAILED' ? 'badge-danger' : 'badge-warning'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="border p-2">Rs. {r.amount || 0}</td>
                  <td className="border p-2 max-w-[200px] truncate" title={r.notes}>{r.notes || '-'}</td>
                  <td className="border p-2">{r.processedAt ? new Date(r.processedAt).toLocaleString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}