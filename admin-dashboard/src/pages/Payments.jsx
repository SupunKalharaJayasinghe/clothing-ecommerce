import React, { useEffect, useState } from 'react'
import { api } from '../utils/http'
import { formatLKR } from '../utils/currency'
import { ChevronDown, ChevronRight, Search, CreditCard, DollarSign, CheckCircle, XCircle, Clock, RefreshCw, Download, FileText } from 'lucide-react'
import { exportPaymentsPDF, exportSinglePaymentPDF } from '../utils/pdfExport'

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

  // PDF export functions
  const handleExportAllPDF = () => {
    if (items.length === 0) {
      alert('No payments to export')
      return
    }
    exportPaymentsPDF(items)
  }

  const handleExportSinglePDF = async (paymentId) => {
    try {
      const res = await api.get(`/admin/payments/${paymentId}/details`)
      exportSinglePaymentPDF(res.data.payment)
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to export payment details')
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[color:var(--text-primary)] mb-2">Payments</h1>
          <p className="text-[color:var(--text-muted)] text-sm">Monitor and manage payment transactions</p>
        </div>
        <div className="filters-compact">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[color:var(--text-muted)]" />
            <input
              placeholder="Search payments..."
              value={q}
              onChange={e=>setQ(e.target.value)}
              className="input min-w-[200px]"
            />
          </div>
          <select value={method} onChange={e=>setMethod(e.target.value)} className="input">
            {methods.map(m => <option key={m} value={m}>{m || 'All methods'}</option>)}
          </select>
          <select value={status} onChange={e=>setStatus(e.target.value)} className="input">
            {(statusesByMethod[method] || statusesByMethod['']).map(s => <option key={s} value={s}>{s || 'All statuses'}</option>)}
          </select>
          <button onClick={load} className="btn btn-secondary whitespace-nowrap">Filter</button>
          <button 
            onClick={handleExportAllPDF}
            className="inline-flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 whitespace-nowrap"
            disabled={items.length === 0}
            type="button"
          >
            <Download size={18} />
            Export PDF
          </button>
        </div>
      </div>

      {error && <div className="card card-body text-red-400 text-sm mb-6 border-red-500/20 bg-red-500/5">{error}</div>}

      <div className="w-full">
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">Payment Transactions</h2>
            <p className="text-sm text-[color:var(--text-muted)] mt-1">Track payment status and verify transactions</p>
          </div>
          <div className="card-body p-0">
            <div className="overflow-x-auto">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th width="40"></th>
                    <th>Order Details</th>
                    <th>Payment Method</th>
                    <th>Status</th>
                    <th>Export</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="text-center py-8">
                        <div className="text-[color:var(--text-muted)]">Loading...</div>
                      </td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-8">
                        <div className="text-[color:var(--text-muted)]">No payments found</div>
                      </td>
                    </tr>
                  ) : items.map(o => {
                    const getPaymentMethodIcon = (method) => {
                      switch(method?.toUpperCase()) {
                        case 'CARD': return <CreditCard size={16} className="text-blue-400" />
                        case 'BANK': return <DollarSign size={16} className="text-green-400" />
                        case 'COD': return <Clock size={16} className="text-orange-400" />
                        default: return <DollarSign size={16} className="text-[color:var(--text-muted)]" />
                      }
                    }
                    
                    const getStatusColor = (status) => {
                      switch(status?.toLowerCase()) {
                        case 'paid': 
                        case 'cod_collected': 
                          return 'text-green-400 bg-green-500/10 border-green-500/20'
                        case 'pending': 
                        case 'cod_pending': 
                          return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
                        case 'failed': 
                          return 'text-red-400 bg-red-500/10 border-red-500/20'
                        case 'refunded': 
                          return 'text-blue-400 bg-blue-500/10 border-blue-500/20'
                        case 'authorized': 
                          return 'text-purple-400 bg-purple-500/10 border-purple-500/20'
                        default: 
                          return 'text-[color:var(--text-muted)] bg-[color:var(--surface-elevated)] border-[color:var(--surface-border)]'
                      }
                    }
                    
                    return (
                      <React.Fragment key={o._id}>
                        <tr>
                          <td>
                            <button 
                              onClick={() => toggleRow(o._id)} 
                              className="p-2 hover:bg-[color:var(--surface-hover)] rounded-lg transition-all duration-200"
                            >
                              {expandedRows.has(o._id) ? 
                                <ChevronDown size={16} className="text-[color:var(--text-secondary)]" /> : 
                                <ChevronRight size={16} className="text-[color:var(--text-secondary)]" />
                              }
                            </button>
                          </td>
                          <td>
                            <div className="font-mono text-sm font-medium text-[color:var(--text-primary)]">
                              #{o._id?.slice(-8)}
                            </div>
                            <div className="text-xs text-[color:var(--text-muted)] mt-1">
                              {new Date(o.createdAt).toLocaleDateString()} {new Date(o.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </div>
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              {getPaymentMethodIcon(o.payment?.method)}
                              <span className="text-sm font-medium text-[color:var(--text-primary)]">
                                {String(o.payment?.method||'N/A').toUpperCase()}
                              </span>
                            </div>
                          </td>
                          <td>
                            <select 
                              value={o.payment?.status || ''} 
                              onChange={e => setPaymentStatus(o._id, e.target.value)} 
                              className="text-sm px-3 py-2 rounded-lg border border-[color:var(--surface-border)] bg-[color:var(--surface-elevated)] text-[color:var(--text-primary)] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 min-w-[120px]"
                            >
                              {(statusesByMethod[o.payment?.method] || statusesByMethod['']).slice(1).map(s => (
                                <option key={s} value={s}>{s.replace('_', ' ').toUpperCase()}</option>
                              ))}
                            </select>
                            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border mt-2 ${getStatusColor(o.payment?.status)}`}>
                              {o.payment?.status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
                            </div>
                          </td>
                          <td>
                            <button 
                              onClick={() => handleExportSinglePDF(o._id)}
                              className="inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white text-sm font-medium rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                              title="Download payment details as PDF"
                            >
                              <FileText size={14} />
                              PDF
                            </button>
                          </td>
                          <td>
                            {o.payment?.method === 'BANK' && (!o.payment?.bank?.verifiedAt) && (
                              <button
                                onClick={() => verifyBank(o._id)} 
                                className="btn btn-sm inline-flex items-center gap-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 transition-all duration-200"
                              >
                                <CheckCircle size={14}/> Verify Bank Slip
                              </button>
                            )}
                            {o.payment?.bank?.verifiedAt && (
                              <div className="inline-flex items-center gap-1 text-green-400 text-sm">
                                <CheckCircle size={14}/> Verified
                              </div>
                            )}
                          </td>
                        </tr>
                        {expandedRows.has(o._id) && (
                          <tr>
                            <td colSpan="6" className="bg-[color:var(--surface-elevated)] border-t border-[color:var(--surface-border)]">
                              <div className="p-6">
                                <div className="flex items-center gap-3 mb-4">
                                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                                    <RefreshCw size={16} className="text-white" />
                                  </div>
                                  <h4 className="text-lg font-semibold text-[color:var(--text-primary)]">Payment Transactions</h4>
                                </div>
                                {txMap[o._id] ? (
                                  txMap[o._id].length > 0 ? (
                                    <div className="bg-[color:var(--surface)] rounded-xl border border-[color:var(--surface-border)] overflow-hidden">
                                      <table className="w-full">
                                        <thead className="bg-[color:var(--surface-elevated)]">
                                          <tr>
                                            <th className="text-left p-4 text-sm font-semibold text-[color:var(--text-primary)]">Date</th>
                                            <th className="text-left p-4 text-sm font-semibold text-[color:var(--text-primary)]">Action</th>
                                            <th className="text-left p-4 text-sm font-semibold text-[color:var(--text-primary)]">Status</th>
                                            <th className="text-left p-4 text-sm font-semibold text-[color:var(--text-primary)]">Amount</th>
                                            <th className="text-left p-4 text-sm font-semibold text-[color:var(--text-primary)]">Notes</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {txMap[o._id].map((tx, i) => (
                                            <tr key={i} className="border-t border-[color:var(--surface-border)]">
                                              <td className="p-4 text-sm text-[color:var(--text-secondary)]">
                                                {new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                              </td>
                                              <td className="p-4 text-sm font-medium text-[color:var(--text-primary)]">{tx.action}</td>
                                              <td className="p-4">
                                                <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(tx.status)}`}>
                                                  {tx.status?.toUpperCase()}
                                                </div>
                                              </td>
                                              <td className="p-4 text-sm font-semibold text-[color:var(--text-primary)]">
{tx.amount ? formatLKR(tx.amount) : '—'}
                                              </td>
                                              <td className="p-4 text-sm text-[color:var(--text-secondary)]">{tx.notes || tx.createdBy || '—'}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  ) : (
                                    <div className="text-center py-8">
                                      <div className="text-[color:var(--text-muted)]">No transactions found</div>
                                    </div>
                                  )
                                ) : (
                                  <div className="text-center py-8">
                                    <div className="text-[color:var(--text-muted)]">Loading transactions...</div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}