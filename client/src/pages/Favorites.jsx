import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../lib/axios'
import { useAppSelector } from '../app/hooks'

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

export default function Favorites() {
  const { user } = useAppSelector(s => s.auth)
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) {
      navigate('/login?next=' + encodeURIComponent('/favorites'))
      return
    }
    (async () => {
      try {
        const { data } = await api.get('/favorites')
        setItems(data.items || [])
      } catch (e) {
        setError(e.response?.data?.message || e.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [user, navigate])

  async function remove(slug) {
    try {
      await api.delete(`/favorites/${slug}`)
      setItems(prev => prev.filter(p => p.slug !== slug))
    } catch (e) {
      // optional: keep UI silent but avoid empty catch for lint
      void e
    }
  }

  if (loading) return <div className="p-6">Loading favorites…</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-bold">Your Favorites</h1>
      {items.length === 0 ? (
        <div className="mt-4 opacity-70">No favorites yet.</div>
      ) : (
        <div className="grid gap-6 mt-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {items.map(p => (
            <div key={p.id} className="group border rounded-2xl overflow-hidden hover:shadow-sm transition relative">
              <button
                onClick={() => remove(p.slug)}
                className="absolute right-2 top-2 rounded-full border px-2 py-1 text-lg bg-white/90 text-red-600"
                title="Remove from favorites"
                aria-label="Remove from favorites"
              >
                ♥
              </button>
              <Link to={`/products/${p.slug}`}>
                <div className="aspect-[4/5] bg-gray-50 overflow-hidden">
                  <img src={p.images?.[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
                </div>
                <div className="p-3 space-y-1">
                  <div className="font-medium leading-snug line-clamp-2">{p.name}</div>
                  <div className="text-sm opacity-70">Color: {p.color}</div>
                  <Price price={p.price} discountPercent={p.discountPercent} finalPrice={p.finalPrice ?? p.price} />
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
