import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
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

const RESERVED = new Set(['men', 'women', 'kids'])

// tiny in-memory cache for recent queries
const cache = new Map()

function useDebounced(value, delay = 350) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export default function ProductListing() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAppSelector(s => s.auth)

  const [favSlugs, setFavSlugs] = useState(new Set())
  const [facets, setFacets] = useState({ colors: [], tags: [], mainTags: [] })

  const q = params.get('q') || ''
  const sort = params.get('sort') || 'new'
  const category = params.get('category') || 'men'
  const color = params.get('color') || ''
  const priceMin = params.get('priceMin') || ''
  const priceMax = params.get('priceMax') || ''
  const ratingMin = params.get('ratingMin') || ''
  const stock = params.get('stock') || 'any'
  const tags = params.get('tags') || ''
  const mainTag = params.get('mainTag') || 'any'

  const qDebounced = useDebounced(q, 350)

  const colorList = useMemo(() => color.split(',').filter(Boolean), [color])
  const tagList = useMemo(() => tags.split(',').filter(Boolean), [tags])

  function setParam(key, value) {
    const next = new URLSearchParams(params)
    if (!value || value === 'any' || (Array.isArray(value) && value.length === 0)) {
      next.delete(key)
    } else {
      next.set(key, Array.isArray(value) ? value.join(',') : String(value))
    }
    setParams(next)
  }

  function toggleInList(key, currentCSV, value) {
    const set = new Set(currentCSV ? currentCSV.split(',').filter(Boolean) : [])
    if (set.has(value)) set.delete(value)
    else set.add(value)
    setParam(key, Array.from(set))
  }

  // request cancellation
  const abortRef = useRef(null)

  useEffect(() => {
    const queryKey = JSON.stringify({ q: qDebounced, sort, category, color, priceMin, priceMax, ratingMin, stock, tags, mainTag })

    if (cache.has(queryKey)) {
      const { items, facets } = cache.get(queryKey)
      setItems(items)
      setFacets(facets)
      setLoading(false)
      return
    }

    setLoading(true); setError('')

    if (abortRef.current) abortRef.current.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    ;(async () => {
      try {
        const { data } = await api.get('/products', {
          params: { q: qDebounced, sort, category, color, priceMin, priceMax, ratingMin, stock, tags, mainTag },
          signal: ctrl.signal
        })
        const payload = { items: data.items || [], facets: data.facets || { colors: [], tags: [], mainTags: [] } }
        cache.set(queryKey, payload)
        setItems(payload.items)
        setFacets(payload.facets)
      } catch (e) {
        if (e.name !== 'CanceledError' && e.code !== 'ERR_CANCELED') {
          setError(e.response?.data?.message || e.message)
        }
      } finally {
        if (!ctrl.signal.aborted) setLoading(false)
      }
    })()

    return () => ctrl.abort()
  }, [qDebounced, sort, category, color, priceMin, priceMax, ratingMin, stock, tags, mainTag])

  useEffect(() => {
    if (!user) { setFavSlugs(new Set()); return }
    ;(async () => {
      try {
        const { data } = await api.get('/favorites/ids')
        setFavSlugs(new Set(data.slugs || []))
      } catch {
        setFavSlugs(new Set())
      }
    })()
  }, [user])

  async function toggleFavorite(e, slug) {
    e.preventDefault()
    e.stopPropagation()
    if (!user) return navigate('/login?next=' + encodeURIComponent('/products?' + params.toString()))
    const next = new Set(favSlugs)
    const isFav = next.has(slug)
    try {
      if (isFav) {
        next.delete(slug)
        setFavSlugs(next)
        await api.delete(`/favorites/${slug}`)
      } else {
        next.add(slug)
        setFavSlugs(next)
        await api.post(`/favorites/${slug}`)
      }
    } catch {
      if (isFav) next.add(slug); else next.delete(slug)
      setFavSlugs(new Set(next))
    }
  }

  function clearFilters() {
    const keep = new URLSearchParams()
    keep.set('category', category)
    setParams(keep)
  }

  if (loading) return <div className="container-app section">Loading products…</div>
  if (error) return <div className="container-app section text-red-600">{error}</div>

  const colorsFacet = (facets.colors || []).filter(Boolean)
  const tagsFacet = (facets.tags || []).filter(t => t && !RESERVED.has(String(t).toLowerCase()))

  return (
    <div className="container-app section">
      {/* Tabs */}
      <div className="mb-8 flex gap-2">
        {['men','women','kids'].map(t => (
          <button
            key={t}
            className={`btn ${category === t ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setParam('category', t)}
          >
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Filters */}
        <aside className="md:col-span-1 card h-max">
          <div className="card-body">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Filters</h2>
            <button className="text-sm underline" onClick={clearFilters}>Clear</button>
          </div>

          {/* Name */}
          <div className="mb-3">
            <label className="text-sm block mb-1">Name</label>
            <input
              className="input"
              placeholder="Search products…"
              value={q}
              onChange={e => setParam('q', e.target.value)}
            />
          </div>

          {/* Color */}
          <div className="mb-3">
            <label className="text-sm block mb-1">Color</label>
            <div className="flex flex-wrap gap-2">
              {colorsFacet.length === 0 && <div className="text-xs opacity-60">No colors</div>}
              {colorsFacet.map(c => {
                const active = colorList.includes(c)
                return (
                  <button
                    key={c}
                    className={`btn ${active ? 'btn-primary' : 'btn-outline'} text-sm px-2 py-1`}
                    onClick={() => toggleInList('color', color, c)}
                  >
                    {c}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Price */}
          <div className="mb-3">
            <label className="text-sm block mb-1">Price (Rs.)</label>
            <div className="flex gap-2">
              <input
                type="number"
                className="input w-1/2"
                placeholder="Min"
                value={priceMin}
                onChange={e => setParam('priceMin', e.target.value)}
              />
              <input
                type="number"
                className="input w-1/2"
                placeholder="Max"
                value={priceMax}
                onChange={e => setParam('priceMax', e.target.value)}
              />
            </div>
          </div>

          {/* Rating */}
          <div className="mb-3">
            <label className="text-sm block mb-1">Rating</label>
            <select
              className="select"
              value={ratingMin}
              onChange={e => setParam('ratingMin', e.target.value)}
            >
              <option value="">Any</option>
              <option value="4">4★ & up</option>
              <option value="3">3★ & up</option>
              <option value="2">2★ & up</option>
              <option value="1">1★ & up</option>
            </select>
          </div>

          {/* Stock */}
          <div className="mb-3">
            <label className="text-sm block mb-1">Stock</label>
            <select
              className="select"
              value={stock}
              onChange={e => setParam('stock', e.target.value)}
            >
              <option value="any">Any</option>
              <option value="in">In stock</option>
              <option value="low">Low stock</option>
              <option value="out">Out of stock</option>
            </select>
          </div>

          {/* Tags */}
          <div className="mb-3">
            <label className="text-sm block mb-1">Tags</label>
            <div className="flex flex-wrap gap-2">
              {(tagsFacet || []).length === 0 && <div className="text-xs opacity-60">No tags</div>}
              {tagsFacet.map(t => {
                const active = tagList.includes(t)
                return (
                  <button
                    key={t}
                    className={`btn ${active ? 'btn-primary' : 'btn-outline'} text-sm px-2 py-1`}
                    onClick={() => toggleInList('tags', tags, t)}
                  >
                    {t}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Main tag */}
          <div className="mb-2">
            <label className="text-sm block mb-1">Main tag</label>
            <div className="flex gap-2 flex-wrap">
              <button
                className={`btn ${mainTag === 'any' ? 'btn-primary' : 'btn-outline'} text-sm px-2 py-1`}
                onClick={() => setParam('mainTag', 'any')}
              >Any</button>
              <button
                className={`btn ${mainTag === 'new' ? 'btn-primary' : 'btn-outline'} text-sm px-2 py-1`}
                onClick={() => setParam('mainTag', 'new')}
              >New</button>
              <button
                className={`btn ${mainTag === 'old' ? 'btn-primary' : 'btn-outline'} text-sm px-2 py-1`}
                onClick={() => setParam('mainTag', 'old')}
              >Old</button>
            </div>
          </div>
          </div>
        </aside>

        {/* Results */}
        <section className="md:col-span-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <h1 className="text-2xl md:text-3xl font-bold">
              {category[0].toUpperCase() + category.slice(1)} — Products
            </h1>
            <div className="flex items-center gap-3">
              <select
                className="select"
                value={sort}
                onChange={e => setParam('sort', e.target.value)}
              >
                <option value="new">Newest</option>
                <option value="price_asc">Price: Low → High</option>
                <option value="price_desc">Price: High → Low</option>
                <option value="rating">Top rated</option>
              </select>
            </div>
          </div>

          {items.length === 0 && (
            <div className="mt-8 card card-body text-center text-sm opacity-80">
              No products found for this selection. Try another tab or clear filters.
            </div>
          )}

          <div className="grid gap-6 mt-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {items.map(p => {
              const isFav = favSlugs.has(p.slug)
              return (
                <Link key={p._id || p.id} to={`/products/${p.slug}`} className="group card card-hover overflow-hidden relative">
                  <div className="product-img relative">
                    <img src={p.images?.[0]} alt={p.name} className="w-full h-full object-cover" />
                    {/* Tags positioned on image */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      {p.mainTags?.includes('new') && <Badge tone="green">New</Badge>}
                      {p.mainTags?.includes('limited') && <Badge tone="amber">Limited</Badge>}
                      {p.mainTags?.includes('bestseller') && <Badge tone="purple">Bestseller</Badge>}
                    </div>
                    {/* Discount tag on right side */}
                    {p.discountPercent > 0 && (
                      <div className="absolute top-2 right-2">
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
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
