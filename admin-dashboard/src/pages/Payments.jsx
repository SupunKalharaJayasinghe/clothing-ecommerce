import React, { useEffect, useState } from 'react'
import { api } from '../utils/http'
import { ChevronDown, ChevronRight } from 'lucide-react'

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
  const [txMap, setTxMap] = useState({})
  const [expandedRows, setExpandedRows] = useState(new Set())

  const fetchTransactions = async (orderId) => {
    try {
      const res = await api.get(`/admin/payments/${orderId}/transactions`, { params: { page: 1, limit: 50 } })
      setTxMap(prev => ({ ...prev, [orderId]: res.data.items || [] }))
      return res.data.items || []
    } catch (e) {
      console.error('Failed to fetch transactions:', e)
      return []
    }
  }

  const toggleRow = async (orderId) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId)
    } else {
      newExpanded.add(orderId)
      if (!txMap[orderId]) {
        await fetchTransactions(orderId)
      }
    }
    setExpandedRows(newExpanded)
  }

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
                <th className="border p-2 text-left" width="40"></th>
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
                <React.Fragment key={o._id}>
                  <tr>
                    <td className="border p-2">
                      <button 
                        onClick={() => toggleRow(o._id)} 
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        {expandedRows.has(o._id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                    </td>
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
                  {expandedRows.has(o._id) && (
                    <tr>
                      <td colSpan="5" className="border p-4 bg-gray-50">
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm mb-2">Payment Transactions</h4>
                          {txMap[o._id] ? (
                            txMap[o._id].length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b">
                                      <th className="text-left p-2">Date</th>
                                      <th className="text-left p-2">Action</th>
                                      <th className="text-left p-2">Status</th>
                                      <th className="text-left p-2">Amount</th>
                                      <th className="text-left p-2">Notes</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {txMap[o._id].map((tx, i) => (
                                      <tr key={i} className="border-b">
                                        <td className="p-2">{new Date(tx.createdAt).toLocaleString()}</td>
                                        <td className="p-2">{tx.action}</td>
                                        <td className="p-2">{tx.status}</td>
                                        <td className="p-2">{tx.amount ? `Rs. ${tx.amount}` : '-'}</td>
                                        <td className="p-2">{tx.notes || tx.createdBy || '-'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500">No transactions found</p>
                            )
                          ) : (
                            <p className="text-sm text-gray-500">Loading transactions...</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}