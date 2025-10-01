import React, { useEffect, useState } from 'react'
import { api, fileUrl } from '../utils/http'
import { Search, Plus, X, RotateCcw, Package, FileText, Eye, CheckCircle, XCircle, Clock, AlertTriangle, Download } from 'lucide-react'
import { exportReturnsPDF, exportSingleReturnPDF } from '../utils/pdfExport'

const statuses = ['', 'requested', 'approved', 'rejected', 'received', 'closed']

export default function RefundsPage() {
  const [items, setItems] = useState([])
  // Removed auditItems - now only shows orders view
  const [q, setQ] = useState('')
  const [method, setMethod] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // Removed viewMode - now only shows orders view
  const [detailOpen, setDetailOpen] = useState(false)
  const [detail, setDetail] = useState(null) // Return doc
  // init form and modal
  const [showModal, setShowModal] = useState(false)
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

  // PDF export functions
  const handleExportAllPDF = () => {
    const dataToExport = viewMode === 'orders' ? items : auditItems
    if (dataToExport.length === 0) {
      alert('No returns to export')
      return
    }
    exportReturnsPDF(dataToExport, viewMode)
  }

  const handleExportSinglePDF = async (returnId) => {
    try {
      const res = await api.get(`/admin/returns/${returnId}/details`)
      exportSingleReturnPDF(res.data.return)
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to export return details')
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[color:var(--text-primary)] mb-2">Returns</h1>
          <p className="text-[color:var(--text-muted)] text-sm">Manage product returns and exchanges</p>
        </div>
        <div className="filters-compact">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[color:var(--text-muted)]" />
            <input
              placeholder="Search returns..."
              value={q}
              onChange={e=>setQ(e.target.value)}
              className="input min-w-[200px]"
            />
          </div>
          <select value={status} onChange={e=>setStatus(e.target.value)} className="input">
            {statuses.map(s => <option key={s} value={s}>{s || 'All statuses'}</option>)}
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
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 whitespace-nowrap"
          >
            <Plus size={20} />
            Init Return
          </button>
        </div>
      </div>

      {error && <div className="card card-body text-red-400 text-sm mb-6 border-red-500/20 bg-red-500/5">{error}</div>}

      <div className="w-full">
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-3">
              <RotateCcw size={20} className="text-[color:var(--text-primary)]" />
              <div>
                <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">Return Requests</h2>
                <p className="text-sm text-[color:var(--text-muted)] mt-1">Orders with return requests</p>
              </div>
            </div>
          </div>
          <div className="card-body p-0">
            <div className="overflow-x-auto">
              <table className="modern-table">
                  <thead>
                    <tr>
                      <th>Order Details</th>
                      <th>Status</th>
                      <th>Reason</th>
                      <th>Last Updated</th>
                      <th>Export</th>
                      <th>Details</th>
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
                            <button 
                              onClick={() => handleExportSinglePDF(o._id)}
                              className="inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white text-sm font-medium rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                              title="Download return details as PDF"
                            >
                              <FileText size={14} />
                              PDF
                            </button>
                          </td>
                          <td>
                            <button
                              className="btn btn-sm inline-flex items-center gap-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 transition-all duration-200"
                              onClick={async () => {
                                try {
                                  const res = await api.get('/admin/returns/audits', { params: { q: o._id, limit: 1 } })
                                  setDetail((res.data.items || [])[0] || null)
                                  setDetailOpen(true)
                                } catch (e) {
                                  alert(e.response?.data?.message || e.message)
                                }
                              }}
                              title="View return details"
                            >
                              <Eye size={14}/> View
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
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

      {/* Return Details Modal */}
      {detailOpen && detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="fixed inset-0 bg-black/70" onClick={() => setDetailOpen(false)}></div>
          <div className="relative bg-[color:var(--surface)] rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-[color:var(--surface-border)] animate-slide-up">
            <div className="px-6 py-4 border-b border-[color:var(--surface-border)] flex items-center justify-between">
              <div>
                <div className="text-sm opacity-70">Order #{(detail.order?._id || detail.order)?.slice(-8)}</div>
                <h3 className="text-lg font-semibold">Return Details</h3>
              </div>
              <button className="btn btn-sm" onClick={() => setDetailOpen(false)}>Close</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="badge">Status: {detail.status}</span>
                {detail.requestedAt && <span className="opacity-70">Requested {new Date(detail.requestedAt).toLocaleString()}</span>}
                {detail.updatedAt && <span className="opacity-70">Updated {new Date(detail.updatedAt).toLocaleString()}</span>}
              </div>
              <div className="text-sm">
                <div className="mb-2"><span className="font-medium">Reason:</span> {detail.reason || '—'}</div>
                <div className="mb-2"><span className="font-medium">Customer Notes:</span> {detail.customerNotes || '—'}</div>
              </div>
              <div>
                <div className="font-medium mb-2">Photos</div>
                {Array.isArray(detail.photos) && detail.photos.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {detail.photos.map((url, i) => (
                      <a key={i} href={fileUrl(url)} target="_blank" rel="noreferrer">
                        <img src={fileUrl(url)} alt="return" className="w-full h-28 object-cover rounded border border-[color:var(--surface-border)]" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm opacity-70">No photos</div>
                )}
              </div>
            </div>
          </div>
        </div>
)}
    </div>
  )
}
