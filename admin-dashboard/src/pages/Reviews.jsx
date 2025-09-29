import React, { useEffect, useState } from 'react'
import { api } from '../utils/http'
import { Search, Star, MessageCircle, User, Package, Trash2, StarIcon } from 'lucide-react'

export default function ReviewsPage() {
  const [items, setItems] = useState([])
  const [q, setQ] = useState('')
  const [slug, setSlug] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/admin/reviews', { params: { q, slug: slug || undefined } })
      setItems(res.data.items)
    } catch (e) {
      setError(e.response?.data?.message || e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const onDelete = async (id) => {
    if (!confirm('Delete this review?')) return
    try {
      await api.delete(`/admin/reviews/${id}`)
      await load()
    } catch (e) {
      alert(e.response?.data?.message || e.message)
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[color:var(--text-primary)] mb-2">Reviews</h1>
          <p className="text-[color:var(--text-muted)] text-sm">Monitor and manage customer reviews</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[color:var(--text-muted)]" />
            <input
              placeholder="Search reviews..."
              value={q}
              onChange={e=>setQ(e.target.value)}
              className="input pl-10 min-w-[200px]"
            />
          </div>
          <input
            placeholder="Filter by product slug"
            value={slug}
            onChange={e=>setSlug(e.target.value)}
            className="input min-w-[180px]"
          />
          <button onClick={load} className="btn btn-secondary whitespace-nowrap">Filter</button>
        </div>
      </div>

      {error && <div className="card card-body text-red-400 text-sm mb-6 border-red-500/20 bg-red-500/5">{error}</div>}

      <div className="w-full">
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-3">
              <MessageCircle size={20} className="text-[color:var(--text-primary)]" />
              <div>
                <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">Customer Reviews</h2>
                <p className="text-sm text-[color:var(--text-muted)] mt-1">Product reviews and ratings from customers</p>
              </div>
            </div>
          </div>
          <div className="card-body p-0">
            <div className="overflow-x-auto">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Customer</th>
                    <th>Rating</th>
                    <th>Review</th>
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
                        <div className="text-[color:var(--text-muted)]">No reviews found</div>
                      </td>
                    </tr>
                  ) : items.map(r => {
                    const renderStars = (rating) => {
                      return Array.from({ length: 5 }, (_, i) => (
                        <Star
                          key={i}
                          size={16}
                          className={i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                        />
                      ))
                    }
                    
                    return (
                      <tr key={r.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <Package size={16} className="text-[color:var(--text-muted)]" />
                            <div>
                              <div className="font-medium text-[color:var(--text-primary)]">{r.product?.name}</div>
                              <div className="text-xs text-[color:var(--text-muted)] mt-1">{r.product?.slug}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <User size={16} className="text-[color:var(--text-muted)]" />
                            <span className="text-sm font-medium text-[color:var(--text-primary)]">
                              {r.user?.name || 'Anonymous'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-1">
                              {renderStars(r.rating)}
                            </div>
                            <div className="text-sm font-semibold text-[color:var(--text-primary)]">
                              {r.rating}/5
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="max-w-[400px] text-sm text-[color:var(--text-secondary)] truncate" title={r.comment}>
                            {r.comment || '—'}
                          </div>
                        </td>
                        <td>
                          <button 
                            onClick={() => onDelete(r.id)} 
                            className="btn btn-sm inline-flex items-center gap-1 bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all duration-200"
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
    </div>
  )
}