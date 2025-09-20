import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../lib/axios'
import { useAppSelector } from '../app/hooks'
import { Heart } from '../lib/icons'

function Price({ price, discountPercent, finalPrice }) {
  if (discountPercent > 0) {
    return (
      <div className="flex items-baseline gap-2">
        <span className="price">Rs. {Number(finalPrice).toLocaleString()}</span>
        <span className="price-old">Rs. {Number(price).toLocaleString()}</span>
        <span className="badge badge-danger">-{discountPercent}%</span>
      </div>
    )
  }
  return <div className="price">Rs. {Number(price).toLocaleString()}</div>
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

  if (loading) return <div className="container-app section">Loading favorites…</div>
  if (error) return <div className="container-app section text-red-600">{error}</div>

  return (
    <div className="container-app section">
      <h1 className="section-title">Your Favorites</h1>
      {items.length === 0 ? (
        <div className="mt-2 card card-body text-sm opacity-80">No favorites yet. Explore products and tap the heart to save your favorites.</div>
      ) : (
        <div className="grid gap-6 mt-8 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {items.map(p => (
            <div key={p.id} className="group card card-hover overflow-hidden relative">
              <button
                onClick={() => remove(p.slug)}
                className="absolute right-2 top-2 btn btn-danger btn-sm rounded-full shadow-soft"
                title="Remove from favorites"
                aria-label="Remove from favorites"
              >
                <Heart size={14} className="fill-white" />
              </button>
              <Link to={`/products/${p.slug}`}>
                <div className="product-img">
                  <img src={p.images?.[0]} alt={p.name} className="w-full h-full object-cover" />
                </div>
                <div className="card-body space-y-2">
                  <div className="card-title leading-snug line-clamp-2">{p.name}</div>
                  <div className="card-subtitle">Color: {p.color}</div>
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
