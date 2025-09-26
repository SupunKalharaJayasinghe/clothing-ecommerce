import React, { useEffect, useState } from 'react'
import { api } from '../utils/http'
import { Search, RefreshCw, DollarSign, CreditCard, Clock, CheckCircle, XCircle, AlertCircle, Eye, FileText } from 'lucide-react'

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
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[color:var(--text-primary)] mb-2">Refunds</h1>
          <p className="text-[color:var(--text-muted)] text-sm">Process and track customer refunds</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-[color:var(--surface-elevated)] rounded-xl border border-[color:var(--surface-border)]">
            <Eye size={16} className="text-[color:var(--text-muted)]" />
            <select value={viewMode} onChange={e=>setViewMode(e.target.value)} className="bg-transparent border-none outline-none text-[color:var(--text-primary)] text-sm font-medium">
              <option value="orders">Orders View</option>
              <option value="audits">Audit Records</option>
            </select>
          </div>
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[color:var(--text-muted)]" />
            <input
              placeholder="Search refunds..."
              value={q}
              onChange={e=>setQ(e.target.value)}
              className="input pl-10 min-w-[200px]"
            />
          </div>
          <select value={method} onChange={e=>setMethod(e.target.value)} className="input min-w-[120px]">
            {methods.map(m => <option key={m} value={m}>{m || 'All methods'}</option>)}
          </select>
          <select value={status} onChange={e=>setStatus(e.target.value)} className="input min-w-[140px]">
            {statuses.map(s => <option key={s} value={s}>{s || 'All statuses'}</option>)}
          </select>
          <button onClick={load} className="btn btn-secondary whitespace-nowrap">Filter</button>
        </div>
      </div>

      {error && <div className="card card-body text-red-400 text-sm mb-6 border-red-500/20 bg-red-500/5">{error}</div>}

      <div className="w-full">
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-3">
              {viewMode === 'orders' ? (
                <>
                  <RefreshCw size={20} className="text-[color:var(--text-primary)]" />
                  <div>
                    <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">Refunded Orders</h2>
                    <p className="text-sm text-[color:var(--text-muted)] mt-1">Orders with refund status</p>
                  </div>
                </>
              ) : (
                <>
                  <FileText size={20} className="text-[color:var(--text-primary)]" />
                  <div>
                    <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">Refund Audit Trail</h2>
                    <p className="text-sm text-[color:var(--text-muted)] mt-1">Detailed refund transaction records</p>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="card-body p-0">
            <div className="overflow-x-auto">
              {viewMode === 'orders' ? (
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th>Order Details</th>
                      <th>Payment Method</th>
                      <th>Status</th>
                      <th>Amount</th>
                      <th>Last Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="5" className="text-center py-8">
                          <div className="text-[color:var(--text-muted)]">Loading...</div>
                        </td>
                      </tr>
                    ) : items.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center py-8">
                          <div className="text-[color:var(--text-muted)]">No refunds found</div>
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
                          case 'refunded': 
                            return 'text-green-400 bg-green-500/10 border-green-500/20'
                          case 'pending': 
                            return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
                          case 'failed': 
                            return 'text-red-400 bg-red-500/10 border-red-500/20'
                          case 'initiated': 
                            return 'text-blue-400 bg-blue-500/10 border-blue-500/20'
                          default: 
                            return 'text-[color:var(--text-muted)] bg-[color:var(--surface-elevated)] border-[color:var(--surface-border)]'
                        }
                      }
                      
                      return (
                        <tr key={o._id}>
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
                            <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(o.payment?.status)}`}>
                              {o.payment?.status?.toUpperCase() || 'UNKNOWN'}
                            </div>
                          </td>
                          <td>
                            <div className="font-semibold text-lg text-[color:var(--text-primary)]">
                              ${o.totals?.grandTotal || 0}
                            </div>
                          </td>
                          <td>
                            <div className="text-sm text-[color:var(--text-secondary)]">
                              {new Date(o.updatedAt).toLocaleDateString()} {new Date(o.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              ) : (
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th>Refund ID</th>
                      <th>Order ID</th>
                      <th>Method</th>
                      <th>Status</th>
                      <th>Amount</th>
                      <th>Notes</th>
                      <th>Processed At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="7" className="text-center py-8">
                          <div className="text-[color:var(--text-muted)]">Loading...</div>
                        </td>
                      </tr>
                    ) : auditItems.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center py-8">
                          <div className="text-[color:var(--text-muted)]">No audit records found</div>
                        </td>
                      </tr>
                    ) : auditItems.map(r => {
                      const getPaymentMethodIcon = (method) => {
                        switch(method?.toUpperCase()) {
                          case 'CARD': return <CreditCard size={16} className="text-blue-400" />
                          case 'BANK': return <DollarSign size={16} className="text-green-400" />
                          case 'COD': return <Clock size={16} className="text-orange-400" />
                          default: return <DollarSign size={16} className="text-[color:var(--text-muted)]" />
                        }
                      }
                      
                      const getAuditStatusColor = (status) => {
                        switch(status?.toLowerCase()) {
                          case 'processed': 
                            return 'text-green-400 bg-green-500/10 border-green-500/20'
                          case 'failed': 
                            return 'text-red-400 bg-red-500/10 border-red-500/20'
                          case 'pending': 
                            return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
                          case 'initiated': 
                            return 'text-blue-400 bg-blue-500/10 border-blue-500/20'
                          default: 
                            return 'text-[color:var(--text-muted)] bg-[color:var(--surface-elevated)] border-[color:var(--surface-border)]'
                        }
                      }
                      
                      return (
                        <tr key={r._id}>
                          <td>
                            <div className="font-mono text-sm font-medium text-[color:var(--text-primary)]">
                              {r._id?.slice(-8)}
                            </div>
                          </td>
                          <td>
                            <div className="font-mono text-sm text-[color:var(--text-secondary)]">
                              #{(r.order?._id || r.order)?.slice(-8)}
                            </div>
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              {getPaymentMethodIcon(r.method)}
                              <span className="text-sm font-medium text-[color:var(--text-primary)]">
                                {String(r.method||'N/A').toUpperCase()}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getAuditStatusColor(r.status)}`}>
                              {r.status?.toUpperCase() || 'UNKNOWN'}
                            </div>
                          </td>
                          <td>
                            <div className="font-semibold text-lg text-[color:var(--text-primary)]">
                              ${r.amount || 0}
                            </div>
                          </td>
                          <td>
                            <div className="max-w-[200px] text-sm text-[color:var(--text-secondary)] truncate" title={r.notes}>
                              {r.notes || '—'}
                            </div>
                          </td>
                          <td>
                            <div className="text-sm text-[color:var(--text-secondary)]">
                              {r.processedAt ? (
                                <>
                                  {new Date(r.processedAt).toLocaleDateString()} {new Date(r.processedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </>
                              ) : '—'}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}