import React, { useEffect, useMemo, useState } from 'react'
import { api } from '../utils/http'
import { useAuth } from '../state/auth'

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
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Products</h1>
        <div className="flex gap-2">
          <input placeholder="Search..." value={q} onChange={e=>setQ(e.target.value)} className="input" />
          <select value={category} onChange={e=>setCategory(e.target.value)} className="input">
            {categories.map(c => <option key={c} value={c}>{c || 'All categories'}</option>)}
          </select>
          <button onClick={load} className="btn btn-primary">Filter</button>
        </div>
      </div>

      {error && <div className="text-red-500 text-sm mb-2">{error}</div>}

      {!canManage ? (
        <div className="card p-4 text-sm">
          <div className="text-[13px] text-gray-400">Access restricted. Only the primary admin or product manager can view and manage products.</div>
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card overflow-hidden">
            <table className="table modern-table">
              <thead>
                <tr>
                  <th className="border p-2 text-left">Name</th>
                  <th className="border p-2 text-left">Price</th>
                  <th className="border p-2 text-left">Stock</th>
                  <th className="border p-2 text-left">Category</th>
                  <th className="border p-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" className="p-4 text-center">Loading...</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan="5" className="p-4 text-center">No products</td></tr>
                ) : items.map(p => (
                  <tr key={p.id}>
                    <td className="border p-2">
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-gray-500">{p.slug}</div>
                    </td>
                    <td className="border p-2">${'{'}p.price{'}'} {p.discountPercent ? <span className="text-xs text-green-700">(-{p.discountPercent}%)</span> : null}</td>
                    <td className="border p-2">{p.stock}</td>
                    <td className="border p-2">{p.category || '-'}</td>
                    <td className="border p-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => onEdit(p)} className="btn btn-light btn-sm">Edit</button>
                        <button onClick={() => onDelete(p.id)} className="btn btn-danger btn-sm">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <h2 className="font-semibold mb-2">{editingId ? 'Edit product' : 'Create product'}</h2>
          <form onSubmit={onSubmit} className="card p-3 text-sm">
            <label className="block text-xs mb-1">Name</label>
            <input className="w-full input mb-2" value={form.name} onChange={e=>setForm(v=>({...v, name: e.target.value}))} />

            <label className="block text-xs mb-1">Image URL</label>
            <input className="w-full input mb-2" value={form.image} onChange={e=>setForm(v=>({...v, image: e.target.value}))} />

            <label className="block text-xs mb-1">Color</label>
            <input className="w-full input mb-2" value={form.color} onChange={e=>setForm(v=>({...v, color: e.target.value}))} />

            <label className="block text-xs mb-1">Description</label>
            <textarea className="w-full input mb-2" rows={4} value={form.description} onChange={e=>setForm(v=>({...v, description: e.target.value}))} />

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs mb-1">Price</label>
                <input type="number" step="0.01" className="w-full input mb-2" value={form.price} onChange={e=>setForm(v=>({...v, price: e.target.value}))} />
              </div>
              <div>
                <label className="block text-xs mb-1">Discount %</label>
                <input type="number" className="w-full input mb-2" value={form.discountPercent} onChange={e=>setForm(v=>({...v, discountPercent: e.target.value}))} />
              </div>
              <div>
                <label className="block text-xs mb-1">Stock</label>
                <input type="number" className="w-full input mb-2" value={form.stock} onChange={e=>setForm(v=>({...v, stock: e.target.value}))} />
              </div>
              <div>
                <label className="block text-xs mb-1">Low stock threshold</label>
                <input type="number" className="w-full input mb-2" value={form.lowStockThreshold} onChange={e=>setForm(v=>({...v, lowStockThreshold: e.target.value}))} />
              </div>
            </div>

            <label className="block text-xs mb-1">Tags (comma separated)</label>
            <input className="w-full input mb-2" value={form.tags} onChange={e=>setForm(v=>({...v, tags: e.target.value}))} />

            <label className="block text-xs mb-1">Main tags</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {mainTagOptions.map(t => (
                <label key={t} className="flex items-center gap-1 text-xs">
                  <input type="checkbox" checked={form.mainTags.includes(t)} onChange={() => toggleMainTag(t)} /> {t}
                </label>
              ))}
            </div>

            <label className="block text-xs mb-1">Category</label>
            <select className="w-full input mb-3" value={form.category} onChange={e=>setForm(v=>({...v, category: e.target.value}))}>
              {categories.map(c => <option key={c} value={c}>{c || '(none)'}</option>)}
            </select>

            <div className="flex items-center gap-2 mt-2">
              {editingId && (
                <button type="button" className="btn btn-light flex-1" onClick={() => { setEditingId(''); setForm({ name: '', image: '', color: '', description: '', price: 0, discountPercent: 0, stock: 0, lowStockThreshold: 5, tags: '', mainTags: [], category: '' }) }}>Cancel</button>
              )}
              <button disabled={saving} className="w-full btn btn-primary disabled:opacity-50 flex-1">{saving ? 'Saving...' : (editingId ? 'Save changes' : 'Create product')}</button>
            </div>
          </form>
        </div>
      </div>
      )}
    </div>
  )
}