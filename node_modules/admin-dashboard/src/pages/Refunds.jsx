import React, { useEffect, useState } from 'react'
import { api } from '../utils/http'

const methods = ['', 'BANK', 'CARD', 'COD']
const statuses = ['', 'refunded', 'paid', 'failed', 'pending', 'initiated']

export default function RefundsPage() {
  const [items, setItems] = useState([])
  const [q, setQ] = useState('')
  const [method, setMethod] = useState('')
  const [status, setStatus] = useState('refunded')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      // Use dedicated refunds API for clarity
      const res = await api.get('/admin/refunds', { params: { q, method: method || undefined, status: status || undefined } })
      setItems(res.data.items)
    } catch (e) {
      setError(e.response?.data?.message || e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Refunds</h1>
        <div className="flex gap-2">
          <input placeholder="Search by order ID or product" value={q} onChange={e=>setQ(e.target.value)} className="border px-2 py-1 rounded" />
          <select value={method} onChange={e=>setMethod(e.target.value)} className="border px-2 py-1 rounded">
            {methods.map(m => <option key={m} value={m}>{m || 'All methods'}</option>)}
          </select>
          <select value={status} onChange={e=>setStatus(e.target.value)} className="border px-2 py-1 rounded">
            {statuses.map(s => <option key={s} value={s}>{s || 'All statuses'}</option>)}
          </select>
          <button onClick={load} className="bg-black text-white px-3 py-1 rounded">Filter</button>
        </div>
      </div>

      {error && <div className="text-red-500 text-sm mb-2">{error}</div>}

      <div className="overflow-x-auto">
        <table className="w-full border text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="border p-2 text-left">Order</th>
              <th className="border p-2 text-left">Method</th>
              <th className="border p-2 text-left">Payment status</th>
              <th className="border p-2 text-left">Updated</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="4" className="p-4 text-center">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan="4" className="p-4 text-center">No refunds</td></tr>
            ) : items.map(o => (
              <tr key={o._id}>
                <td className="border p-2">
                  <div className="font-medium">{o._id}</div>
                  <div className="text-xs text-gray-500">{new Date(o.createdAt).toLocaleString()}</div>
                </td>
                <td className="border p-2">{o.payment?.method}</td>
                <td className="border p-2">{o.payment?.status}</td>
                <td className="border p-2">{new Date(o.updatedAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}