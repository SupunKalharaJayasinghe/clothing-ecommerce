import React, { useEffect, useState } from 'react'
import { api } from '../utils/http'

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
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Reviews</h1>
        <div className="flex gap-2">
          <input placeholder="Search comment..." value={q} onChange={e=>setQ(e.target.value)} className="input" />
          <input placeholder="Filter by product slug" value={slug} onChange={e=>setSlug(e.target.value)} className="input" />
          <button onClick={load} className="btn btn-primary">Filter</button>
        </div>
      </div>

      {error && <div className="text-red-500 text-sm mb-2">{error}</div>}

      <table className="table">
        <thead className="bg-gray-50">
          <tr>
            <th className="border p-2 text-left">Product</th>
            <th className="border p-2 text-left">User</th>
            <th className="border p-2 text-left">Rating</th>
            <th className="border p-2 text-left">Comment</th>
            <th className="border p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan="5" className="p-4 text-center">Loading...</td></tr>
          ) : items.length === 0 ? (
            <tr><td colSpan="5" className="p-4 text-center">No reviews</td></tr>
          ) : items.map(r => (
            <tr key={r.id}>
              <td className="border p-2">{r.product?.name} <div className="text-xs text-[color:var(--ink-muted)]">{r.product?.slug}</div></td>
              <td className="border p-2">{r.user?.name}</td>
              <td className="border p-2">{r.rating}</td>
              <td className="border p-2 max-w-[400px] truncate" title={r.comment}>{r.comment}</td>
              <td className="border p-2 text-center">
<button onClick={() => onDelete(r.id)} className="btn btn-danger">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}