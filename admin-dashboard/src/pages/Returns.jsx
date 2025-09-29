import React, { useEffect, useState } from 'react'
import { api } from '../utils/http'
import { Search, Plus, X, RotateCcw, Package, FileText, Eye, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react'

const statuses = ['', 'requested', 'approved', 'rejected', 'received', 'closed']

export default function ReturnsPage() {
  const [items, setItems] = useState([])
  const [auditItems, setAuditItems] = useState([])
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [viewMode, setViewMode] = useState('orders') // 'orders' or 'audits'

  // init form and modal
  const [showModal, setShowModal] = useState(false)
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

  const openCreateModal = () => {
    setNewOrderId('')
    setReason('')
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setNewOrderId('')
    setReason('')
  }

  const initReturn = async (e) => {
    e.preventDefault()
    if (!newOrderId) return
    setCreating(true)
    try {
      await api.post(`/admin/returns/${newOrderId}/init`, { reason })
      setNewOrderId('')
      setReason('')
      setShowModal(false)
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
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[color:var(--text-primary)] mb-2">Returns</h1>
          <p className="text-[color:var(--text-muted)] text-sm">Manage product returns and exchanges</p>
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
              placeholder="Search returns..."
              value={q}
              onChange={e=>setQ(e.target.value)}
              className="input pl-10 min-w-[200px]"
            />
          </div>
          <select value={status} onChange={e=>setStatus(e.target.value)} className="input min-w-[140px]">
            {statuses.map(s => <option key={s} value={s}>{s || 'All statuses'}</option>)}
          </select>
          <button onClick={load} className="btn btn-secondary whitespace-nowrap">Filter</button>
          {viewMode === 'orders' && (
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 whitespace-nowrap"
            >
              <Plus size={20} />
              Init Return
            </button>
          )}
        </div>
      </div>

      {error && <div className="card card-body text-red-400 text-sm mb-6 border-red-500/20 bg-red-500/5">{error}</div>}

      <div className="w-full">
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-3">
              {viewMode === 'orders' ? (
                <>
                  <RotateCcw size={20} className="text-[color:var(--text-primary)]" />
                  <div>
                    <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">Return Requests</h2>
                    <p className="text-sm text-[color:var(--text-muted)] mt-1">Orders with return requests</p>
                  </div>
                </>
              ) : (
                <>
                  <FileText size={20} className="text-[color:var(--text-primary)]" />
                  <div>
                    <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">Return Audit Trail</h2>
                    <p className="text-sm text-[color:var(--text-muted)] mt-1">Detailed return transaction records</p>
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
                      <th>Return Status</th>
                      <th>Reason</th>
                      <th>Last Updated</th>
                      <th>Actions</th>
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
                          <div className="text-[color:var(--text-muted)]">No returns found</div>
                        </td>
                      </tr>
                    ) : items.map(o => {
                      const getStatusColor = (status) => {
                        switch(status?.toLowerCase()) {
                          case 'approved': 
                          case 'received':
                          case 'closed':
                            return 'text-green-400 bg-green-500/10 border-green-500/20'
                          case 'requested': 
                            return 'text-blue-400 bg-blue-500/10 border-blue-500/20'
                          case 'rejected': 
                            return 'text-red-400 bg-red-500/10 border-red-500/20'
                          default: 
                            return 'text-[color:var(--text-muted)] bg-[color:var(--surface-elevated)] border-[color:var(--surface-border)]'
                        }
                      }
                      
                      const getStatusIcon = (status) => {
                        switch(status?.toLowerCase()) {
                          case 'approved': 
                          case 'received':
                          case 'closed':
                            return <CheckCircle size={14} />
                          case 'requested': 
                            return <Clock size={14} />
                          case 'rejected': 
                            return <XCircle size={14} />
                          default: 
                            return <AlertTriangle size={14} />
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
                            <div className="space-y-2">
                              <select 
                                value={o.returnRequest?.status || ''} 
                                onChange={e=>updateStatus(o._id, e.target.value)} 
                                className="text-sm px-3 py-2 rounded-lg border border-[color:var(--surface-border)] bg-[color:var(--surface-elevated)] text-[color:var(--text-primary)] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 min-w-[120px]"
                              >
                                {statuses.slice(1).map(s => (
                                  <option key={s} value={s}>{s.toUpperCase()}</option>
                                ))}
                              </select>
                              <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(o.returnRequest?.status)}`}>
                                {getStatusIcon(o.returnRequest?.status)}
                                {o.returnRequest?.status?.toUpperCase() || 'UNKNOWN'}
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="max-w-[300px] text-sm text-[color:var(--text-secondary)] truncate" title={o.returnRequest?.reason}>
                              {o.returnRequest?.reason || '—'}
                            </div>
                          </td>
                          <td>
                            <div className="text-sm text-[color:var(--text-secondary)]">
                              {o.returnRequest?.updatedAt ? (
                                <>
                                  {new Date(o.returnRequest.updatedAt).toLocaleDateString()} {new Date(o.returnRequest.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </>
                              ) : '—'}
                            </div>
                          </td>
                          <td>
                            <div className="text-sm text-[color:var(--text-muted)]">—</div>
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
                      <th>Return ID</th>
                      <th>Order ID</th>
                      <th>Status</th>
                      <th>Reason</th>
                      <th>Requested At</th>
                      <th>Updated At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="6" className="text-center py-8">
                          <div className="text-[color:var(--text-muted)]">Loading...</div>
                        </td>
                      </tr>
                    ) : auditItems.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center py-8">
                          <div className="text-[color:var(--text-muted)]">No audit records found</div>
                        </td>
                      </tr>
                    ) : auditItems.map(r => {
                      const getAuditStatusColor = (status) => {
                        switch(status?.toLowerCase()) {
                          case 'closed': 
                            return 'text-green-400 bg-green-500/10 border-green-500/20'
                          case 'approved': 
                          case 'received': 
                            return 'text-blue-400 bg-blue-500/10 border-blue-500/20'
                          case 'rejected': 
                            return 'text-red-400 bg-red-500/10 border-red-500/20'
                          case 'requested': 
                            return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
                          default: 
                            return 'text-[color:var(--text-muted)] bg-[color:var(--surface-elevated)] border-[color:var(--surface-border)]'
                        }
                      }
                      
                      const getAuditStatusIcon = (status) => {
                        switch(status?.toLowerCase()) {
                          case 'closed': 
                            return <CheckCircle size={14} />
                          case 'approved': 
                          case 'received': 
                            return <Package size={14} />
                          case 'rejected': 
                            return <XCircle size={14} />
                          case 'requested': 
                            return <Clock size={14} />
                          default: 
                            return <AlertTriangle size={14} />
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
                            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getAuditStatusColor(r.status)}`}>
                              {getAuditStatusIcon(r.status)}
                              {r.status?.toUpperCase() || 'UNKNOWN'}
                            </div>
                          </td>
                          <td>
                            <div className="max-w-[200px] text-sm text-[color:var(--text-secondary)] truncate" title={r.reason}>
                              {r.reason || '—'}
                            </div>
                          </td>
                          <td>
                            <div className="text-sm text-[color:var(--text-secondary)]">
                              {r.requestedAt ? (
                                <>
                                  {new Date(r.requestedAt).toLocaleDateString()} {new Date(r.requestedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </>
                              ) : '—'}
                            </div>
                          </td>
                          <td>
                            <div className="text-sm text-[color:var(--text-secondary)]">
                              {r.updatedAt ? (
                                <>
                                  {new Date(r.updatedAt).toLocaleDateString()} {new Date(r.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
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

      {/* Init Return Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md" onClick={closeModal}></div>
          <div className="relative bg-[color:var(--surface)] rounded-3xl shadow-2xl max-w-2xl w-full max-h-[95vh] overflow-hidden border border-[color:var(--surface-border)] animate-slide-up">
            {/* Header */}
            <div className="relative px-8 py-6 bg-gradient-to-r from-blue-600/10 to-purple-600/10 border-b border-[color:var(--surface-border)]">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-[color:var(--text-primary)] mb-1">Initialize Return</h2>
                  <p className="text-[color:var(--text-muted)]">Start a return process for an order</p>
                </div>
                <button onClick={closeModal} className="p-3 hover:bg-[color:var(--surface-hover)] rounded-xl transition-all duration-200 hover:scale-110">
                  <X size={24} className="text-[color:var(--text-muted)]" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="px-8 py-6">
              <form onSubmit={initReturn} className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                    <RotateCcw size={16} className="text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-[color:var(--text-primary)]">Return Details</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-[color:var(--text-primary)]">Order ID *</label>
                    <input 
                      className="w-full px-4 py-3 bg-[color:var(--surface-elevated)] border border-[color:var(--surface-border)] rounded-xl text-[color:var(--text-primary)] placeholder-[color:var(--text-muted)] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200" 
                      value={newOrderId} 
                      onChange={e=>setNewOrderId(e.target.value)} 
                      placeholder="Enter order ID"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-[color:var(--text-primary)]">Return Reason *</label>
                    <textarea 
                      rows={4} 
                      className="w-full px-4 py-3 bg-[color:var(--surface-elevated)] border border-[color:var(--surface-border)] rounded-xl text-[color:var(--text-primary)] placeholder-[color:var(--text-muted)] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 resize-none" 
                      value={reason} 
                      onChange={e=>setReason(e.target.value)} 
                      placeholder="Describe the reason for return..."
                      required
                    />
                  </div>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="px-8 py-6 bg-[color:var(--surface-elevated)] border-t border-[color:var(--surface-border)]">
              <div className="flex flex-col sm:flex-row gap-4">
                <button type="button" onClick={closeModal} className="flex-1 px-6 py-3 bg-[color:var(--surface-hover)] hover:bg-[color:var(--surface-border)] text-[color:var(--text-secondary)] font-semibold rounded-xl transition-all duration-200 border border-[color:var(--surface-border)]">Cancel</button>
                <button disabled={creating} onClick={initReturn} className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:transform-none disabled:opacity-50">
                  {creating ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Creating...
                    </div>
                  ) : (
                    'Initialize Return'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}