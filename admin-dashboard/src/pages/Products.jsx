import React, { useEffect, useMemo, useState } from 'react'
import { api } from '../utils/http'
import { useAuth } from '../state/auth'
import { Search, Plus, X, Trash2, Package, Tag, DollarSign, Download, FileText } from 'lucide-react'
import { formatLKR } from '../utils/currency'
import { exportProductsPDF, exportSingleProductPDF } from '../utils/pdfExport'

const mainTagOptions = ['discount','new','limited','bestseller','featured']
const categories = ['', 'men', 'women', 'kids']

export default function ProductsPage() {
  const { user } = useAuth()
  const canManage = Boolean(user?.isPrimaryAdmin || (user?.roles || []).includes('product_manager'))

  const [items, setItems] = useState([])
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '',
    image: '',
    color: '',
    description: '',
    price: 0,
    discountPercent: 0,
    stock: 0,
    lowStockThreshold: 5,
    tags: '',
    mainTags: [],
    category: ''
  })
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState('')
  const [showModal, setShowModal] = useState(false)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/admin/products', { params: { q, category: category || undefined } })
      setItems(res.data.items)
    } catch (e) {
      setError(e.response?.data?.message || e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!canManage) { alert('Only the primary admin or product manager can save products.'); return }
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        images: [form.image].filter(Boolean),
        color: form.color,
        description: form.description,
        price: Number(form.price || 0),
        discountPercent: Number(form.discountPercent || 0),
        stock: Number(form.stock || 0),
        lowStockThreshold: Number(form.lowStockThreshold || 5),
        tags: (form.tags || '').split(',').map(s => s.trim()).filter(Boolean),
        mainTags: form.mainTags,
        category: form.category || undefined
      }
      if (editingId) {
        await api.patch(`/admin/products/${editingId}`, payload)
      } else {
        await api.post('/admin/products', payload)
      }
      setForm({ name: '', image: '', color: '', description: '', price: 0, discountPercent: 0, stock: 0, lowStockThreshold: 5, tags: '', mainTags: [], category: '' })
      setEditingId('')
      setShowModal(false)
      await load()
    } catch (e) {
      alert(e.response?.data?.message || e.message)
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async (id) => {
    if (!canManage) { alert('Only the primary admin or product manager can delete products.'); return }
    if (!confirm('Delete this product?')) return
    try {
      await api.delete(`/admin/products/${id}`)
      await load()
    } catch (e) {
      alert(e.response?.data?.message || e.message)
    }
  }

  const toggleMainTag = (tag) => {
    setForm(f => {
      const exists = f.mainTags.includes(tag)
      return { ...f, mainTags: exists ? f.mainTags.filter(t => t !== tag) : [...f.mainTags, tag] }
    })
  }

  const onEdit = (p) => {
    if (!canManage) return
    setEditingId(p.id)
    setForm({
      name: p.name || '',
      image: Array.isArray(p.images) && p.images.length ? p.images[0] : '',
      color: p.color || '',
      description: p.description || '',
      price: p.price || 0,
      discountPercent: p.discountPercent || 0,
      stock: p.stock || 0,
      lowStockThreshold: p.lowStockThreshold || 5,
      tags: (p.tags || []).join(', '),
      mainTags: p.mainTags || [],
      category: p.category || ''
    })
    setShowModal(true)
  }

  const openCreateModal = () => {
    if (!canManage) return
    setEditingId('')
    setForm({ name: '', image: '', color: '', description: '', price: 0, discountPercent: 0, stock: 0, lowStockThreshold: 5, tags: '', mainTags: [], category: '' })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingId('')
    setForm({ name: '', image: '', color: '', description: '', price: 0, discountPercent: 0, stock: 0, lowStockThreshold: 5, tags: '', mainTags: [], category: '' })
  }

  // PDF export functions
  const handleExportAllPDF = () => {
    console.log('Export all products PDF clicked')
    console.log('Products:', items)
    
    if (items.length === 0) {
      alert('No products to export')
      return
    }
    
    exportProductsPDF(items)
  }

  const handleExportSinglePDF = async (productId) => {
    try {
      const res = await api.get(`/admin/products/${productId}/details`)
      exportSingleProductPDF(res.data.product)
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to export product details')
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[color:var(--text-primary)] mb-2">Products</h1>
          <p className="text-[color:var(--text-muted)] text-sm">Manage store products and inventory</p>
        </div>
        <div className="filters-compact">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[color:var(--text-muted)]" />
            <input
              placeholder="Search products..."
              value={q}
              onChange={e=>setQ(e.target.value)}
              className="input min-w-[200px]"
            />
          </div>
          <select value={category} onChange={e=>setCategory(e.target.value)} className="input">
            {categories.map(c => <option key={c} value={c}>{c || 'All categories'}</option>)}
          </select>
          <button onClick={load} className="btn btn-secondary whitespace-nowrap">Filter</button>
          {canManage && (
            <button 
              onClick={handleExportAllPDF}
              className="inline-flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 whitespace-nowrap"
              disabled={items.length === 0}
              type="button"
            >
              <Download size={18} />
              Export PDF
            </button>
          )}
          {canManage && (
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 whitespace-nowrap"
            >
              <Plus size={20} />
              Create Product
            </button>
          )}
        </div>
      </div>

      {error && <div className="card card-body text-red-400 text-sm mb-6 border-red-500/20 bg-red-500/5">{error}</div>}

      {!canManage ? (
        <div className="card card-body text-[color:var(--text-muted)] text-sm">
          <div>Access restricted. Only the primary admin or product manager can view and manage products.</div>
        </div>
      ) : (
        <div className="w-full">
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">Product Inventory</h2>
              <p className="text-sm text-[color:var(--text-muted)] mt-1">Manage products and stock levels</p>
            </div>
            <div className="card-body p-0">
              <div className="overflow-x-auto">
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Price</th>
                      <th>Stock</th>
                      <th>Category</th>
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
                          <div className="text-[color:var(--text-muted)]">No products found</div>
                        </td>
                      </tr>
                    ) : items.map(p => (
                      <tr key={p.id}>
                        <td>
                          <div className="font-medium text-[color:var(--text-primary)]">{p.name}</div>
                          <div className="text-xs text-[color:var(--text-muted)]">{p.slug}</div>
                        </td>
                        <td>
<div className="font-semibold text-[color:var(--text-primary)]">{formatLKR(p.price)}</div>
                          {p.discountPercent > 0 && (
                            <div className="text-xs text-green-400">-{p.discountPercent}% off</div>
                          )}
                        </td>
                        <td>
                          <div className={`font-medium ${p.stock <= (p.lowStockThreshold || 5) ? 'text-red-400' : 'text-[color:var(--text-secondary)]'}`}>
                            {p.stock}
                          </div>
                        </td>
                        <td>
                          <div className="text-[color:var(--text-secondary)]">{p.category || '-'}</div>
                        </td>
                        <td>
                          <button 
                            onClick={() => handleExportSinglePDF(p.id)}
                            className="inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white text-sm font-medium rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                            title="Download product details as PDF"
                          >
                            <FileText size={14} />
                            PDF
                          </button>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <button onClick={() => onEdit(p)} className="btn btn-secondary btn-sm">Edit</button>
                            <button onClick={() => onDelete(p.id)} className="btn btn-sm inline-flex items-center gap-1 bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30">
                              <Trash2 size={14}/> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md" onClick={closeModal}></div>
          <div className="relative bg-[color:var(--surface)] rounded-3xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden border border-[color:var(--surface-border)] animate-slide-up">
            {/* Header */}
            <div className="relative px-8 py-6 bg-gradient-to-r from-blue-600/10 to-purple-600/10 border-b border-[color:var(--surface-border)]">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-[color:var(--text-primary)] mb-1">{editingId ? 'Edit Product' : 'Create Product'}</h2>
                  <p className="text-[color:var(--text-muted)]">{editingId ? 'Update product information and inventory' : 'Add a new product to the store'}</p>
                </div>
                <button onClick={closeModal} className="p-3 hover:bg-[color:var(--surface-hover)] rounded-xl transition-all duration-200 hover:scale-110">
                  <X size={24} className="text-[color:var(--text-muted)]" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="px-8 py-6 max-h-[calc(95vh-200px)] overflow-y-auto">
              <form onSubmit={onSubmit} className="space-y-8">
                {/* Basic Information */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                      <Package size={16} className="text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-[color:var(--text-primary)]">Basic Information</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-[color:var(--text-primary)]">Product Name *</label>
                      <input className="w-full px-4 py-3 bg-[color:var(--surface-elevated)] border border-[color:var(--surface-border)] rounded-xl text-[color:var(--text-primary)] placeholder-[color:var(--text-muted)] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200" value={form.name} onChange={e=>setForm(v=>({...v, name: e.target.value}))} placeholder="Enter product name" required/>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-[color:var(--text-primary)]">Color</label>
                      <input className="w-full px-4 py-3 bg-[color:var(--surface-elevated)] border border-[color:var(--surface-border)] rounded-xl text-[color:var(--text-primary)] placeholder-[color:var(--text-muted)] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200" value={form.color} onChange={e=>setForm(v=>({...v, color: e.target.value}))} placeholder="Product color"/>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-[color:var(--text-primary)]">Image URL</label>
                    <input className="w-full px-4 py-3 bg-[color:var(--surface-elevated)] border border-[color:var(--surface-border)] rounded-xl text-[color:var(--text-primary)] placeholder-[color:var(--text-muted)] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200" value={form.image} onChange={e=>setForm(v=>({...v, image: e.target.value}))} placeholder="https://example.com/image.jpg"/>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-[color:var(--text-primary)]">Description</label>
                    <textarea rows={4} className="w-full px-4 py-3 bg-[color:var(--surface-elevated)] border border-[color:var(--surface-border)] rounded-xl text-[color:var(--text-primary)] placeholder-[color:var(--text-muted)] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 resize-none" value={form.description} onChange={e=>setForm(v=>({...v, description: e.target.value}))} placeholder="Product description"/>
                  </div>
                </div>

                {/* Pricing & Inventory */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
                      <DollarSign size={16} className="text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-[color:var(--text-primary)]">Pricing & Inventory</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-[color:var(--text-primary)]">Price *</label>
                      <input type="number" step="0.01" className="w-full px-4 py-3 bg-[color:var(--surface-elevated)] border border-[color:var(--surface-border)] rounded-xl text-[color:var(--text-primary)] placeholder-[color:var(--text-muted)] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200" value={form.price} onChange={e=>setForm(v=>({...v, price: e.target.value}))} placeholder="0.00" required/>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-[color:var(--text-primary)]">Discount %</label>
                      <input type="number" min="0" max="100" className="w-full px-4 py-3 bg-[color:var(--surface-elevated)] border border-[color:var(--surface-border)] rounded-xl text-[color:var(--text-primary)] placeholder-[color:var(--text-muted)] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200" value={form.discountPercent} onChange={e=>setForm(v=>({...v, discountPercent: e.target.value}))} placeholder="0"/>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-[color:var(--text-primary)]">Stock Quantity *</label>
                      <input type="number" min="0" className="w-full px-4 py-3 bg-[color:var(--surface-elevated)] border border-[color:var(--surface-border)] rounded-xl text-[color:var(--text-primary)] placeholder-[color:var(--text-muted)] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200" value={form.stock} onChange={e=>setForm(v=>({...v, stock: e.target.value}))} placeholder="0" required/>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-[color:var(--text-primary)]">Low Stock Alert</label>
                      <input type="number" min="0" className="w-full px-4 py-3 bg-[color:var(--surface-elevated)] border border-[color:var(--surface-border)] rounded-xl text-[color:var(--text-primary)] placeholder-[color:var(--text-muted)] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200" value={form.lowStockThreshold} onChange={e=>setForm(v=>({...v, lowStockThreshold: e.target.value}))} placeholder="5"/>
                    </div>
                  </div>
                </div>

                {/* Categories & Tags */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                      <Tag size={16} className="text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-[color:var(--text-primary)]">Categories & Tags</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-[color:var(--text-primary)]">Category</label>
                      <select className="w-full px-4 py-3 bg-[color:var(--surface-elevated)] border border-[color:var(--surface-border)] rounded-xl text-[color:var(--text-primary)] focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200" value={form.category} onChange={e=>setForm(v=>({...v, category: e.target.value}))}>
                        {categories.map(c => <option key={c} value={c}>{c || '(none)'}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-[color:var(--text-primary)]">Tags</label>
                      <input className="w-full px-4 py-3 bg-[color:var(--surface-elevated)] border border-[color:var(--surface-border)] rounded-xl text-[color:var(--text-primary)] placeholder-[color:var(--text-muted)] focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200" value={form.tags} onChange={e=>setForm(v=>({...v, tags: e.target.value}))} placeholder="tag1, tag2, tag3"/>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <label className="block text-sm font-semibold text-[color:var(--text-primary)]">Main Tags</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {mainTagOptions.map(t => (
                        <button
                          type="button"
                          key={t}
                          className={`p-3 rounded-xl border text-left transition-all duration-200 ${
                            form.mainTags.includes(t)
                              ? 'bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-red-500/20 border-purple-400/60 shadow-lg shadow-purple-500/25'
                              : 'bg-[color:var(--surface-elevated)] border-[color:var(--surface-border)] hover:border-purple-400/50 hover:shadow-md'
                          }`}
                          onClick={() => toggleMainTag(t)}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`font-medium text-sm capitalize ${
                              form.mainTags.includes(t) ? 'text-[color:var(--text-primary)]' : 'text-[color:var(--text-secondary)]'
                            }`}>
                              {t}
                            </span>
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                              form.mainTags.includes(t)
                                ? 'bg-purple-500 border-purple-500'
                                : 'border-[color:var(--surface-border)]'
                            }`}>
                              {form.mainTags.includes(t) && (
                                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="px-8 py-6 bg-[color:var(--surface-elevated)] border-t border-[color:var(--surface-border)]">
              <div className="flex flex-col sm:flex-row gap-4">
                <button type="button" onClick={closeModal} className="flex-1 px-6 py-3 bg-[color:var(--surface-hover)] hover:bg-[color:var(--surface-border)] text-[color:var(--text-secondary)] font-semibold rounded-xl transition-all duration-200 border border-[color:var(--surface-border)]">Cancel</button>
                <button disabled={saving} onClick={onSubmit} className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:transform-none disabled:opacity-50">
                  {saving ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Saving...
                    </div>
                  ) : (
                    editingId ? 'Save Changes' : 'Create Product'
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