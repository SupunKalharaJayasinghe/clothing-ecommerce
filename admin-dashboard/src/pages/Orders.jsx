import React, { useEffect, useMemo, useState } from 'react'
import { api } from '../utils/http'
import { formatLKR } from '../utils/currency'
import { Search, Plus, X, Trash2, Package, CreditCard, Truck, User, MapPin, ShoppingCart, PackageCheck, TruckIcon, Download, FileText } from 'lucide-react'
import { exportOrdersPDF, exportSingleOrderPDF } from '../utils/pdfExport'

// Clean status sets for Admin
const filterStatuses = [
  '',
  'CONFIRMED','PACKING','SHIPPED','OUT_FOR_DELIVERY','DELIVERED','CANCELLED','RETURNED'
]

export default function OrdersPage() {
  const [items, setItems] = useState([])
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Delivery agents for assignment
  const [agents, setAgents] = useState([])

  // Handover assignment overlay state
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignFor, setAssignFor] = useState('')
  const [assignAgent, setAssignAgent] = useState('')

  // Create Order form state and modal
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    userId: '',
    method: 'COD',
    items: [{ slug: '', quantity: 1 }],
    useDefault: true,
    address: { line1: '', city: '', country: 'Sri Lanka', phone: '' }
  })

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/admin/orders', { params: { q, status: status || undefined } })
      setItems(res.data.items)
    } catch (e) {
      setError(e.response?.data?.message || e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])
  const loadAgentsList = async () => {
    try {
      const res = await api.get('/admin/delivery', { params: { limit: 100 } })
      setAgents(res.data.items || [])
    } catch (e) {
      // surface error so user knows why list is empty
      alert(e.response?.data?.message || e.message)
      setAgents([])
    }
  }
  useEffect(() => { loadAgentsList() }, [])

  const updateStatus = async (id, next) => {
    try {
      // Collect extra fields when required by server rules
      const payload = { status: next }
      if (next === 'dispatched') {
        const scanRef = prompt('Enter dispatch scan reference (or leave empty to attach a photo URL next):') || ''
        const photoUrl = scanRef ? '' : (prompt('Enter dispatch photo URL (optional):') || '')
        payload.evidence = {}
        if (scanRef) payload.evidence.scanRef = scanRef
        if (photoUrl) payload.evidence.photoUrl = photoUrl
      }
      if (['attempted','failed','exception','return_to_sender'].includes(next)) {
        const reason = prompt(`Enter reason for ${next.toUpperCase()}: (e.g., NO_ANSWER / address issue)`)
        if (reason) payload.reason = { detail: reason }
      }
      if (next === 'delivered') {
        const pod = prompt('Enter POD evidence: OTP code OR a photo/signature URL. If OTP, type the code; otherwise paste a URL.') || ''
        payload.evidence = {}
        if (/^\d{4,6}$/.test(pod)) payload.evidence.otp = pod
        else if (pod) payload.evidence.podPhotoUrl = pod
      }
      await api.patch(`/admin/orders/${id}/status`, payload)
      await load()
    } catch (e) {
      alert(e.response?.data?.message || e.message)
    }
  }

  const verifyBank = async (id) => {
    try {
      await api.post(`/admin/payments/bank/${id}/verify`)
      await load()
    } catch (e) {
      alert(e.response?.data?.message || e.message)
    }
  }

  // Inline status dropdown handler (placed | packed | dispatched)
  const setStatusInline = async (id, value) => {
    if (value === 'dispatched') {
      await loadAgentsList()
      setAssignFor(id)
      setAssignOpen(true)
      return
    }
    try {
      await api.patch(`/admin/orders/${id}/status`, { status: value })
      await load()
    } catch (e) {
      alert(e.response?.data?.message || e.message)
    }
  }

  const submitAssign = async () => {
    if (!assignFor) return
    if (!assignAgent) {
      alert('Please select a delivery person.')
      return
    }
    const payload = { status: 'dispatched', assignDeliveryId: assignAgent }
    try {
      await api.patch(`/admin/orders/${assignFor}/status`, payload)
      setAssignOpen(false)
      setAssignFor('')
      setAssignAgent('')
      await load()
    } catch (e) {
      alert(e.response?.data?.message || e.message)
    }
  }

  const deleteOrder = async (id) => {
    if (!confirm('Delete this order? This will restore stock if not handed over to delivery.')) return
    try {
      await api.delete(`/admin/orders/${id}`)
      await load()
    } catch (e) {
      alert(e.response?.data?.message || e.message)
    }
  }

  const addItemRow = () => setForm(f => ({ ...f, items: [...f.items, { slug: '', quantity: 1 }] }))
  const removeItemRow = (i) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))

  const openCreateModal = () => {
    setForm({ userId: '', method: 'COD', items: [{ slug: '', quantity: 1 }], useDefault: true, address: { line1: '', city: '', country: 'Sri Lanka', phone: '' } })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setForm({ userId: '', method: 'COD', items: [{ slug: '', quantity: 1 }], useDefault: true, address: { line1: '', city: '', country: 'Sri Lanka', phone: '' } })
  }

  const createOrder = async (e) => {
    e?.preventDefault?.()
    try {
      const payload = {
        userId: form.userId.trim(),
        method: form.method,
        items: form.items.filter(it => it.slug.trim()).map(it => ({ slug: it.slug.trim(), quantity: Number(it.quantity) || 1 }))
      }
      if (!form.useDefault) {
        payload.address = {
          line1: form.address.line1.trim(),
          city: form.address.city.trim(),
          country: form.address.country.trim(),
          phone: form.address.phone.trim()
        }
      }
      await api.post('/admin/orders', payload)
      alert('Order created')
      setForm({ userId: '', method: 'COD', items: [{ slug: '', quantity: 1 }], useDefault: true, address: { line1: '', city: '', country: 'Sri Lanka', phone: '' } })
      setShowModal(false)
      await load()
    } catch (e) {
      alert(e.response?.data?.message || e.message)
    }
  }

  // PDF export functions
  const handleExportAllPDF = () => {
    if (items.length === 0) {
      alert('No orders to export')
      return
    }
    exportOrdersPDF(items)
  }

  const handleExportSinglePDF = async (orderId) => {
    try {
      const res = await api.get(`/admin/orders/${orderId}/details`)
      exportSingleOrderPDF(res.data.order)
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to export order details')
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[color:var(--text-primary)] mb-2">Orders</h1>
          <p className="text-[color:var(--text-muted)] text-sm">Manage customer orders and fulfillment</p>
        </div>
        <div className="filters-compact">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[color:var(--text-muted)]" />
            <input
              placeholder="Search orders..."
              value={q}
              onChange={e=>setQ(e.target.value)}
              className="input min-w-[200px]"
            />
          </div>
          <select value={status} onChange={e=>setStatus(e.target.value)} className="input">
            {filterStatuses.map(s => <option key={s} value={s}>{s || 'All statuses'}</option>)}
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
            Create Order
          </button>
        </div>
      </div>

      {error && <div className="card card-body text-red-400 text-sm mb-6 border-red-500/20 bg-red-500/5">{error}</div>}

      <div className="w-full">
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">Order Management</h2>
            <p className="text-sm text-[color:var(--text-muted)] mt-1">Track and fulfill customer orders</p>
          </div>
          <div className="card-body p-0">
            <div className="overflow-x-auto">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Order Details</th>
                    <th>Payment</th>
                    <th>Status</th>
                    <th>Courier</th>
                    <th>Total</th>
                    <th>Export</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="text-center py-8">
                        <div className="text-[color:var(--text-muted)]">Loading...</div>
                      </td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-8">
                        <div className="text-[color:var(--text-muted)]">No orders found</div>
                      </td>
                    </tr>
                  ) : items.map(o => {
                    const method = String(o.payment?.method || '').toUpperCase()
                    const pay = String(o.payment?.status || '').toUpperCase()
                    const state = String(o.orderState || o.status || '').toUpperCase()
                    const total = Number(o.totals?.grandTotal ?? 0)
                    
                    const getPaymentStatusColor = (status) => {
                      switch(status) {
                        case 'PAID': return 'text-green-400 bg-green-500/10 border-green-500/20'
                        case 'PENDING': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
                        case 'FAILED': return 'text-red-400 bg-red-500/10 border-red-500/20'
                        case 'REFUNDED': return 'text-blue-400 bg-blue-500/10 border-blue-500/20'
                        default: return 'text-[color:var(--text-muted)] bg-[color:var(--surface-elevated)] border-[color:var(--surface-border)]'
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
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <CreditCard size={14} className="text-[color:var(--text-muted)]" />
                              <span className="text-sm font-medium text-[color:var(--text-primary)]">
                                {method || 'N/A'}
                              </span>
                            </div>
                            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPaymentStatusColor(pay)}`}>
                              {pay || 'Unknown'}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="space-y-2">
                            <select 
                              className="text-sm px-3 py-2 rounded-lg border border-[color:var(--surface-border)] bg-[color:var(--surface-elevated)] text-[color:var(--text-primary)] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 min-w-[120px]" 
                              value={state === 'PACKING' ? 'packed' : state === 'SHIPPED' ? 'dispatched' : 'placed'} 
                              onChange={e=>setStatusInline(o._id, e.target.value)}
                            >
                              <option value="placed">Placed</option>
                              <option value="packed">Packed</option>
                              <option value="dispatched">Handover</option>
                            </select>
                            <div className="flex items-center gap-1">
                              {state === 'PACKING' || state === 'packed' ? (
                                <>
                                  <PackageCheck size={14} className="text-yellow-400" />
                                  <span className="text-xs text-yellow-400 font-medium">PACKED</span>
                                </>
                              ) : state === 'SHIPPED' || state === 'dispatched' ? (
                                <>
                                  <TruckIcon size={14} className="text-blue-400" />
                                  <span className="text-xs text-blue-400 font-medium">DISPATCHED</span>
                                </>
                              ) : (
                                <>
                                  <ShoppingCart size={14} className="text-green-400" />
                                  <span className="text-xs text-green-400 font-medium">PLACED</span>
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <Truck size={14} className="text-[color:var(--text-muted)]" />
                            <span className="text-sm text-[color:var(--text-secondary)]">
                              {o.assignedDelivery 
                                ? `${o.assignedDelivery.firstName || ''} ${o.assignedDelivery.lastName || ''}`.trim() || 'Assigned'
                                : 'Unassigned'
                              }
                            </span>
                          </div>
                        </td>
                        <td>
<div className="font-semibold text-lg text-[color:var(--text-primary)]">
                            {formatLKR(total, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </td>
                        <td>
                          <button 
                            onClick={() => handleExportSinglePDF(o._id)}
                            className="inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white text-sm font-medium rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                            title="Download order details as PDF"
                          >
                            <FileText size={14} />
                            PDF
                          </button>
                        </td>
                        <td>
                          <button 
                            className="btn btn-sm inline-flex items-center gap-1 bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all duration-200" 
                            title="Delete order" 
                            onClick={() => deleteOrder(o._id)}
                          >
                            <Trash2 size={14}/> Delete
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

      {/* Create Order Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md" onClick={closeModal}></div>
          <div className="relative bg-[color:var(--surface)] rounded-3xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden border border-[color:var(--surface-border)] animate-slide-up">
            {/* Header */}
            <div className="relative px-8 py-6 bg-gradient-to-r from-blue-600/10 to-purple-600/10 border-b border-[color:var(--surface-border)]">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-[color:var(--text-primary)] mb-1">Create Order</h2>
                  <p className="text-[color:var(--text-muted)]">Create a new order for a customer</p>
                </div>
                <button onClick={closeModal} className="p-3 hover:bg-[color:var(--surface-hover)] rounded-xl transition-all duration-200 hover:scale-110">
                  <X size={24} className="text-[color:var(--text-muted)]" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="px-8 py-6 max-h-[calc(95vh-200px)] overflow-y-auto">
              <form onSubmit={createOrder} className="space-y-8">
                {/* Customer Information */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                      <User size={16} className="text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-[color:var(--text-primary)]">Customer Information</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-[color:var(--text-primary)]">Customer ID *</label>
                      <input className="w-full px-4 py-3 bg-[color:var(--surface-elevated)] border border-[color:var(--surface-border)] rounded-xl text-[color:var(--text-primary)] placeholder-[color:var(--text-muted)] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200" value={form.userId} onChange={e=>setForm(f=>({...f, userId:e.target.value}))} placeholder="Enter customer ID" required/>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-[color:var(--text-primary)]">Payment Method *</label>
                      <select className="w-full px-4 py-3 bg-[color:var(--surface-elevated)] border border-[color:var(--surface-border)] rounded-xl text-[color:var(--text-primary)] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200" value={form.method} onChange={e=>setForm(f=>({...f, method:e.target.value}))}>
                        <option value="COD">Cash on Delivery</option>
                        <option value="CARD">Credit Card</option>
                        <option value="BANK">Bank Transfer</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
                      <Package size={16} className="text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-[color:var(--text-primary)]">Order Items</h3>
                  </div>
                  
                  <div className="space-y-4">
                    {form.items.map((item, idx) => (
                      <div key={idx} className="flex gap-4 p-4 bg-[color:var(--surface-elevated)] rounded-xl border border-[color:var(--surface-border)]">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-[color:var(--text-primary)] mb-2">Product Slug</label>
                          <input className="w-full px-4 py-3 bg-[color:var(--surface)] border border-[color:var(--surface-border)] rounded-xl text-[color:var(--text-primary)] placeholder-[color:var(--text-muted)] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200" placeholder="product-slug" value={item.slug} onChange={e=>setForm(f=>{const items=[...f.items];items[idx]={...items[idx], slug:e.target.value};return {...f, items}})} />
                        </div>
                        <div className="w-24">
                          <label className="block text-sm font-medium text-[color:var(--text-primary)] mb-2">Qty</label>
                          <input className="w-full px-4 py-3 bg-[color:var(--surface)] border border-[color:var(--surface-border)] rounded-xl text-[color:var(--text-primary)] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200" type="number" min="1" value={item.quantity} onChange={e=>setForm(f=>{const items=[...f.items];items[idx]={...items[idx], quantity:e.target.value};return {...f, items}})} />
                        </div>
                        <div className="flex items-end">
                          <button type="button" className="px-4 py-3 bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 rounded-xl transition-all duration-200" onClick={()=>removeItemRow(idx)}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                    <button type="button" className="w-full px-4 py-3 border-2 border-dashed border-[color:var(--surface-border)] hover:border-emerald-400 text-[color:var(--text-muted)] hover:text-emerald-400 rounded-xl transition-all duration-200 flex items-center justify-center gap-2" onClick={addItemRow}>
                      <Plus size={16} /> Add Item
                    </button>
                  </div>
                </div>

                {/* Shipping Address */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                      <MapPin size={16} className="text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-[color:var(--text-primary)]">Shipping Address</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <label className="flex items-center gap-3 p-4 bg-[color:var(--surface-elevated)] rounded-xl border border-[color:var(--surface-border)] cursor-pointer hover:border-purple-400/50 transition-all duration-200">
                      <input type="checkbox" checked={form.useDefault} onChange={e=>setForm(f=>({...f, useDefault:e.target.checked}))} className="w-4 h-4 text-purple-500 bg-[color:var(--surface)] border-[color:var(--surface-border)] rounded focus:ring-purple-500/20 focus:ring-2" />
                      <span className="text-[color:var(--text-primary)] font-medium">Use customer's default address</span>
                    </label>

                    {!form.useDefault && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-[color:var(--text-primary)]">Address Line 1 *</label>
                          <input className="w-full px-4 py-3 bg-[color:var(--surface-elevated)] border border-[color:var(--surface-border)] rounded-xl text-[color:var(--text-primary)] placeholder-[color:var(--text-muted)] focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200" value={form.address.line1} onChange={e=>setForm(f=>({...f, address:{...f.address, line1:e.target.value}}))} placeholder="Street address" required={!form.useDefault} />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-[color:var(--text-primary)]">City *</label>
                          <input className="w-full px-4 py-3 bg-[color:var(--surface-elevated)] border border-[color:var(--surface-border)] rounded-xl text-[color:var(--text-primary)] placeholder-[color:var(--text-muted)] focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200" value={form.address.city} onChange={e=>setForm(f=>({...f, address:{...f.address, city:e.target.value}}))} placeholder="City" required={!form.useDefault} />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-[color:var(--text-primary)]">Country *</label>
                          <input className="w-full px-4 py-3 bg-[color:var(--surface-elevated)] border border-[color:var(--surface-border)] rounded-xl text-[color:var(--text-primary)] placeholder-[color:var(--text-muted)] focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200" value={form.address.country} onChange={e=>setForm(f=>({...f, address:{...f.address, country:e.target.value}}))} placeholder="Country" required={!form.useDefault} />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-[color:var(--text-primary)]">Phone *</label>
                          <input className="w-full px-4 py-3 bg-[color:var(--surface-elevated)] border border-[color:var(--surface-border)] rounded-xl text-[color:var(--text-primary)] placeholder-[color:var(--text-muted)] focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200" value={form.address.phone} onChange={e=>setForm(f=>({...f, address:{...f.address, phone:e.target.value}}))} placeholder="Phone number" required={!form.useDefault} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="px-8 py-6 bg-[color:var(--surface-elevated)] border-t border-[color:var(--surface-border)]">
              <div className="flex flex-col sm:flex-row gap-4">
                <button type="button" onClick={closeModal} className="flex-1 px-6 py-3 bg-[color:var(--surface-hover)] hover:bg-[color:var(--surface-border)] text-[color:var(--text-secondary)] font-semibold rounded-xl transition-all duration-200 border border-[color:var(--surface-border)]">Cancel</button>
                <button onClick={createOrder} className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200">
                  Create Order
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {assignOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 grid place-items-center p-4" onClick={()=>setAssignOpen(false)}>
          <div className="card w-full max-w-md" onClick={e=>e.stopPropagation()}>
            <div className="card-header font-semibold">Handover assignment</div>
            <div className="card-body grid gap-3">
              <div>
                <label className="label">Delivery person</label>
                <select className="input w-full" value={assignAgent} onChange={e=>setAssignAgent(e.target.value)}>
                  <option value="">— Select delivery person —</option>
                  {agents.map(a => (
                    <option key={a.id} value={a.id}>{a.fullName || a.phone || a.email || a.id}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="card-footer flex justify-end gap-2">
              <button className="btn" onClick={()=>setAssignOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={submitAssign}>Handover</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}