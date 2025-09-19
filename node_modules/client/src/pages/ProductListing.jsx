import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../lib/axios'

function Price({ price, discountPercent, finalPrice }) {
  if (discountPercent > 0) {
    return (
      <div className="flex items-baseline gap-2">
        <span className="font-semibold">Rs. {finalPrice.toLocaleString()}</span>
        <span className="line-through text-sm opacity-70">Rs. {price.toLocaleString()}</span>
        <span className="text-xs bg-red-100 text-red-700 rounded px-1 py-0.5">-{discountPercent}%</span>
      </div>
    )
  }
  return <div className="font-semibold">Rs. {price.toLocaleString()}</div>
}

function Stars({ rating }) {
  // Render 5 stars
  const r = Math.round((rating || 0) * 2) / 2
  return (
    <div className="text-yellow-500" aria-label={`Rating ${r} out of 5`}>
      {'★★★★★'.split('').map((s, i) => {
        const full = i + 1 <= Math.floor(r)
        const half = !full && i + 0.5 < r + 0.001
        return (
          <span key={i} className={half ? 'relative' : ''}>
            {full ? '★' : '☆'}
            {half && <span className="absolute left-0 overflow-hidden w-1/2">★</span>}
          </span>
        )
      })}
    </div>
  )
}

function Badge({ children, tone = 'gray' }) {
  const tones = {
    gray: 'bg-gray-100 text-gray-700',
    green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-700',
    blue: 'bg-blue-100 text-blue-700',
    amber: 'bg-amber-100 text-amber-700',
    purple: 'bg-purple-100 text-purple-700'
  }
  return <span className={`text-xs rounded px-2 py-0.5 ${tones[tone]}`}>{children}</span>
}

export default function ProductListing() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [params, setParams] = useSearchParams()

  const q = params.get('q') || ''
  const sort = params.get('sort') || 'new'

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/products', { params: { q, sort } })
        setItems(data.items || [])
      } catch (e) {
        setError(e.response?.data?.message || e.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [q, sort])

  function updateParam(key, value) {
    const next = new URLSearchParams(params)
    if (!value) next.delete(key)
    else next.set(key, value)
    setParams(next)
  }

  if (loading) return <div className="p-6">Loading products…</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h1 className="text-2xl font-bold">Products</h1>
        <div className="flex items-center gap-3">
          <input
            className="border rounded-lg px-3 py-2 w-64"
            placeholder="Search products…"
            value={q}
            onChange={e => updateParam('q', e.target.value)}
          />
          <select
            className="border rounded-lg px-3 py-2"
            value={sort}
            onChange={e => updateParam('sort', e.target.value)}
          >
            <option value="new">Newest</option>
            <option value="price_asc">Price: Low → High</option>
            <option value="price_desc">Price: High → Low</option>
            <option value="rating">Top rated</option>
          </select>
        </div>
      </div>

      <div className="grid gap-6 mt-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {items.map(p => (
          <Link key={p._id} to={`/products/${p.slug}`} className="group border rounded-2xl overflow-hidden hover:shadow-sm transition">
            <div className="aspect-[4/5] bg-gray-50 overflow-hidden">
              <img src={p.images?.[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
            </div>
            <div className="p-3 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                {p.mainTags?.includes('new') && <Badge tone="green">New</Badge>}
                {p.mainTags?.includes('limited') && <Badge tone="amber">Limited</Badge>}
                {p.mainTags?.includes('bestseller') && <Badge tone="purple">Bestseller</Badge>}
                {p.discountPercent > 0 && <Badge tone="red">-{p.discountPercent}%</Badge>}
              </div>
              <div className="font-medium leading-snug line-clamp-2">{p.name}</div>
              <div className="text-sm opacity-70">Color: {p.color}</div>
              <Price price={p.price} discountPercent={p.discountPercent} finalPrice={p.finalPrice ?? p.price} />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-sm">
                  <Stars rating={p.rating} />
                  <span className="opacity-70">({p.reviewsCount})</span>
                </div>
                {p.lowStock ? <Badge tone="red">Low stock</Badge> : p.stock > 0 ? <Badge tone="blue">In stock</Badge> : <Badge>Out</Badge>}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
