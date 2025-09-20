import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../lib/axios'
import { useAppSelector } from '../app/hooks'
import { Heart } from '../lib/icons'

function Price({ price, discountPercent, finalPrice }) {
  if (discountPercent > 0) {
    return (
      <div className="flex items-baseline gap-2">
        <span className="price">Rs. {Number(finalPrice ?? price).toLocaleString()}</span>
        <span className="price-old">Rs. {Number(price).toLocaleString()}</span>
      </div>
    )
  }
  return <div className="price">Rs. {Number(price).toLocaleString()}</div>
}

function Stars({ rating }) {
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

function Badge({ children, tone = 'neutral' }) {
  const tones = {
    neutral: 'badge badge-neutral',
    green: 'badge badge-success',
    red: 'badge badge-danger',
    blue: 'badge badge-info',
    amber: 'badge badge-warning',
    purple: 'badge badge-accent'
  }
  return <span className={tones[tone] || tones.neutral}>{children}</span>
}

// Helper function to get proper color values with good contrast
function getColorValue(colorName) {
  if (!colorName) return '#6b7280' // gray-500 default
  
  const color = colorName.toLowerCase().trim()
  const colorMap = {
    // Basic colors with good contrast
    'red': '#ef4444',
    'blue': '#3b82f6', 
    'mid blue': '#3b82f6',
    'navy': '#1e40af',
    'green': '#22c55e',
    'yellow': '#eab308',
    'orange': '#f97316',
    'purple': '#a855f7',
    'pink': '#ec4899',
    'black': '#1f2937',
    'white': '#f9fafb',
    'gray': '#6b7280',
    'grey': '#6b7280',
    'brown': '#92400e',
    'beige': '#d6d3d1',
    'cream': '#fef7cd',
    // Add more color mappings as needed
  }
  
  // Return mapped color or try to use the color name directly
  return colorMap[color] || color || '#6b7280'
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
      <div className="text-center mb-8">
        <h1 className="section-title">💖 Your Favorites</h1>
        <p className="section-subtitle mt-2">Your handpicked collection of amazing products</p>
      </div>
      
      {items.length === 0 ? (
        <div className="max-w-md mx-auto text-center">
          <div className="card card-body space-y-4">
            <div className="text-6xl opacity-20">💔</div>
            <div>
              <h3 className="font-semibold text-lg mb-2">No favorites yet</h3>
              <p className="text-sm opacity-80 mb-4">Discover amazing products and tap the heart to save your favorites here.</p>
              <Link to="/products" className="btn btn-primary">
                Start Shopping
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm opacity-70">{items.length} item{items.length !== 1 ? 's' : ''} in your favorites</p>
            <div className="flex items-center gap-2">
              <span className="text-xs opacity-60">Sort by:</span>
              <select className="select text-sm">
                <option>Recently Added</option>
                <option>Price: Low to High</option>
                <option>Price: High to Low</option>
                <option>Name A-Z</option>
              </select>
            </div>
          </div>
          
          <div className="grid gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {items.map(p => (
              <Link key={p.id} to={`/products/${p.slug}`} className="group card card-hover overflow-hidden block">
                <div className="product-img relative">
                  <img src={p.images?.[0]} alt={p.name} className="w-full h-full object-cover" />
                  {/* Remove button */}
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      remove(p.slug)
                    }}
                    className="absolute right-2 top-2 btn btn-danger btn-sm rounded-full shadow-soft z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove from favorites"
                    aria-label="Remove from favorites"
                  >
                    <Heart size={12} className="fill-white" />
                  </button>
                  {/* Tags positioned on image */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {p.mainTags?.includes('new') && <Badge tone="green">New</Badge>}
                    {p.mainTags?.includes('limited') && <Badge tone="amber">Limited</Badge>}
                    {p.mainTags?.includes('bestseller') && <Badge tone="purple">Bestseller</Badge>}
                  </div>
                  {/* Discount tag on right side */}
                  {p.discountPercent > 0 && (
                    <div className="absolute bottom-2 right-2">
                      <Badge tone="red">-{p.discountPercent}%</Badge>
                    </div>
                  )}
                </div>
                <div className="card-body space-y-3 p-4">
                  <div>
                    <div className="card-title leading-snug line-clamp-2 mb-1">{p.name}</div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="card-subtitle">Color:</span>
                      <div 
                        className="w-4 h-4 rounded-full border-2 border-gray-400 shadow-sm"
                        style={{ 
                          backgroundColor: getColorValue(p.color),
                          minWidth: '16px',
                          minHeight: '16px'
                        }}
                        title={p.color}
                      ></div>
                    </div>
                  </div>
                  
                  <Price price={p.price} discountPercent={p.discountPercent} finalPrice={p.finalPrice ?? p.price} />
                  
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1 text-xs">
                      <Stars rating={p.rating} />
                      <span className="opacity-70">({p.reviewsCount || 0})</span>
                    </div>
                    <div className="text-right">
                      {p.lowStock ? <Badge tone="red">Low stock</Badge> : p.stock > 0 ? <Badge tone="green">In stock</Badge> : <Badge>Out of stock</Badge>}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
