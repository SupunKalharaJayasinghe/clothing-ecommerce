import React, { useEffect, useState } from 'react'
import { api } from '../utils/http'
import { formatLKR } from '../utils/currency'
import { Search, RefreshCw, DollarSign, CreditCard, Clock, CheckCircle, FileText, Download, TrendingUp } from 'lucide-react'
import { exportRefundsPDF, exportSingleRefundPDF } from '../utils/pdfExport'

const methods = ['', 'BANK', 'CARD', 'COD']
const statuses = ['', 'REQUESTED', 'APPROVED', 'PROCESSING', 'PROCESSED', 'FAILED', 'CANCELLED']

export default function RefundsPage() {
  const [items, setItems] = useState([])
  const [q, setQ] = useState('')
  const [method, setMethod] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [stats, setStats] = useState(null)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/admin/refunds', { params: { q, method: method || undefined, status: status || undefined } })
      setItems(res.data.items)
    } catch (e) {
      // Treat 404/204-like empty responses as "no data" instead of an error banner
      const statusCode = e?.response?.status
      if (statusCode === 404 || statusCode === 204) {
        setItems([])
        setError('')
      } else {
        setError(e.response?.data?.message || e.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const res = await api.get('/admin/refunds/stats')
      setStats(res.data.stats)
    } catch (e) {
      console.error('Failed to load stats:', e)
    }
  }

  useEffect(() => { 
    load()
    loadStats()
  }, [])



  // PDF export functions
  const handleExportAllPDF = () => {
    if (items.length === 0) {
      alert('No refunds to export')
      return
    }
    exportRefundsPDF(items, 'orders')
  }

  const handleExportSinglePDF = async (refundId) => {
    try {
      const res = await api.get(`/admin/refunds/${refundId}/details`)
      exportSingleRefundPDF(res.data.refund)
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to export refund details')
    }
  }

  return (
    <div className="animate-fade-in refunds-page">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[color:var(--text-primary)] mb-2">Refunds</h1>
          <p className="text-[color:var(--text-muted)] text-sm">Process and track customer refunds</p>
        </div>
        <div className="filters-compact">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[color:var(--text-muted)]" />
            <input
              placeholder="Search refunds..."
              value={q}
              onChange={e=>setQ(e.target.value)}
              className="input min-w-[200px]"
            />
          </div>
          <select value={method} onChange={e=>setMethod(e.target.value)} className="input">
            {methods.map(m => <option key={m} value={m}>{m || 'All methods'}</option>)}
          </select>
          <select value={status} onChange={e=>setStatus(e.target.value)} className="input">
            {statuses.map(s => <option key={s} value={s}>{s || 'All statuses'}</option>)}
          </select>
          <button onClick={load} className="btn btn-secondary whitespace-nowrap">Filter</button>
          <button 
            onClick={handleExportAllPDF}
            className="btn btn-secondary inline-flex items-center gap-2 whitespace-nowrap"
            disabled={items.length === 0}
            type="button"
          >
            <Download size={16} />
            Export PDF
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card card-body">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <RefreshCw size={24} className="text-blue-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[color:var(--text-primary)]">{stats.totalRefunds}</div>
                <div className="text-sm text-[color:var(--text-muted)]">Total Refunds</div>
              </div>
            </div>
          </div>
          <div className="card card-body">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-yellow-500/10 rounded-xl flex items-center justify-center">
                <Clock size={24} className="text-yellow-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[color:var(--text-primary)]">{stats.pendingRefunds}</div>
                <div className="text-sm text-[color:var(--text-muted)]">Pending</div>
              </div>
            </div>
          </div>
          <div className="card card-body">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                <CheckCircle size={24} className="text-green-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[color:var(--text-primary)]">{stats.processedRefunds}</div>
                <div className="text-sm text-[color:var(--text-muted)]">Processed</div>
              </div>
            </div>
          </div>
          <div className="card card-body">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
                <TrendingUp size={24} className="text-purple-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[color:var(--text-primary)]">{formatLKR(stats.totalAmount)}</div>
                <div className="text-sm text-[color:var(--text-muted)]">Total Amount</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && <div className="card card-body text-red-400 text-sm mb-6 border-red-500/20 bg-red-500/5">{error}</div>}

      <div className="w-full">
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-3">
              <RefreshCw size={20} className="text-[color:var(--text-primary)]" />
              <div>
                <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">Refunded Orders</h2>
                <p className="text-sm text-[color:var(--text-muted)] mt-1">Orders with refund status</p>
              </div>
            </div>
          </div>
          <div className="card-body p-0">
            <div className="overflow-x-auto">
              <table className="modern-table">
                  <thead>
                    <tr>
                      <th>Order Details</th>
                      <th>Payment Method</th>
                      <th>Status</th>
                      <th>Amount</th>
                      <th>Export</th>
                      <th>Last Updated</th>
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
                              {formatLKR(o.totals?.grandTotal || 0)}
                            </div>
                          </td>
                          <td>
                            <button 
                              onClick={() => handleExportSinglePDF(o._id)}
                              className="inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white text-sm font-medium rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                              title="Download refund details as PDF"
                            >
                              <FileText size={14} />
                              PDF
                            </button>
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
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
