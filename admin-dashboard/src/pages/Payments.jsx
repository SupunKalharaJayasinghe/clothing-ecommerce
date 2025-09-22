import React, { useEffect, useState } from 'react'
import { api } from '../utils/http'

const methods = ['', 'BANK', 'CARD', 'COD']
const statusesByMethod = {
  '': ['', 'pending','authorized','paid','failed','refunded','cod_pending','cod_collected'],
  COD: ['', 'cod_pending','cod_collected','refunded','failed'],
  CARD: ['', 'pending','authorized','paid','refunded','failed'],
  BANK: ['', 'pending','paid','refunded','failed']
}

export default function PaymentsPage() {
  const [items, setItems] = useState([])
  const [q, setQ] = useState('')
  const [method, setMethod] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/admin/payments', { params: { q, method: method || undefined, status: status || undefined } })
      setItems(res.data.items)
    } catch (e) {
      setError(e.response?.data?.message || e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const verifyBank = async (id) => {
    if (!confirm('Verify this bank slip?')) return
    try {
      await api.post(`/admin/payments/bank/${id}/verify`)
      await load()
    } catch (e) {
      alert(e.response?.data?.message || e.message)
    }
  }

  const setPaymentStatus = async (id, s) => {
    try {
      await api.patch(`/admin/payments/${id}/status`, { status: s })
      await load()
    } catch (e) {
      alert(e.response?.data?.message || e.message)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Payments</h1>
        <div className="flex gap-2">
          <input placeholder="Search by order ID or product" value={q} onChange={e=>setQ(e.target.value)} className="input" />
          <select value={method} onChange={e=>setMethod(e.target.value)} className="input">
            {methods.map(m => <option key={m} value={m}>{m || 'All methods'}</option>)}
          </select>
          <select value={status} onChange={e=>setStatus(e.target.value)} className="input">
            {(statusesByMethod[method] || statusesByMethod['']).map(s => <option key={s} value={s}>{s || 'All statuses'}</option>)}
          </select>
          <button onClick={load} className="btn btn-primary">Filter</button>
        </div>
      </div>

      {error && <div className="text-red-500 text-sm mb-2">{error}</div>}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table modern-table">
            <thead>
              <tr>
                <th className="border p-2 text-left">Order</th>
                <th className="border p-2 text-left">Method</th>
                <th className="border p-2 text-left">Payment status</th>
                <th className="border p-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" className="p-4 text-center">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan="4" className="p-4 text-center">No payments</td></tr>
              ) : items.map(o => (
                <tr key={o._id}>
                  <td className="border p-2">
                    <div className="font-medium break-all">{o._id}</div>
                    <div className="text-xs text-[color:var(--ink-muted)]">{new Date(o.createdAt).toLocaleString()}</div>
                  </td>
                  <td className="border p-2 whitespace-nowrap">{String(o.payment?.method||'').toUpperCase()}</td>
                  <td className="border p-2">
                    <select value={o.payment?.status || ''} onChange={e => setPaymentStatus(o._id, e.target.value)} className="input">
                      {(statusesByMethod[o.payment?.method] || statusesByMethod['']).slice(1).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="border p-2">
                    {o.payment?.method === 'BANK' && (!o.payment?.bank?.verifiedAt) && (
                      <button onClick={() => verifyBank(o._id)} className="btn btn-primary btn-sm">Verify bank slip</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}