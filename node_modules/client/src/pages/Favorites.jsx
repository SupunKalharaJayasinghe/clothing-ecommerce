import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/axios'
import { useAppSelector } from '../app/hooks'
import { Heart, Trash2 } from '../lib/icons'
import Price from '../components/ui/Price'
import Stars from '../components/ui/Stars'
import Badge from '../components/ui/Badge'
import { getColorValue } from '../lib/colors'
import Loader from '../components/ui/Loader'

 

export default function Favorites() {
  const { user } = useAppSelector(s => s.auth)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function clearAll() {
    const slugs = items.map(p => p.slug)
    setItems([])
    await Promise.allSettled(slugs.map(s => api.delete(`/favorites/${s}`)))
  }

  useEffect(() => {
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
  }, [user])

  async function remove(slug) {
    try {
      await api.delete(`/favorites/${slug}`)
      setItems(prev => prev.filter(p => p.slug !== slug))
    } catch (e) {
      // optional: keep UI silent but avoid empty catch for lint
      void e
    }
  }

  if (loading) return <Loader />
  if (error) return <div className="container-app section text-red-600">{error}</div>

  return (
    <div className="container-app section">
      <div className="mb-4 border-b pb-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Favorites</h1>
            <p className="text-sm text-[--color-muted] mt-1">Your handpicked collection of amazing products</p>
          </div>
        </div>
      </div>
      
      {items.length === 0 ? (
        <div className="max-w-md mx-auto text-center">
          <div className="card card-body space-y-4">
            <div className="flex justify-center">
              <Heart size={56} className="opacity-20" />
            </div>
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
          <div className="mb-3 text-sm opacity-70">{items.length} item{items.length !== 1 ? 's' : ''} in your favorites</div>
          
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {items.map(p => (
              <Link key={p.id} to={`/products/${p.slug}`} className="group card product-card card-hover overflow-hidden block">
                <div className="product-img relative" style={{ aspectRatio: '3 / 4' }}>
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
                    <Trash2 size={14} />
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
                <div className="card-body space-y-2 p-3">
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
