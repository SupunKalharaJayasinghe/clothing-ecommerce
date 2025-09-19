import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
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

  if (loading) return <div className="p-6">Loading products…</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>

  const colorsFacet = (facets.colors || []).filter(Boolean)
  const tagsFacet = (facets.tags || []).filter(t => t && !RESERVED.has(String(t).toLowerCase()))

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Tabs */}
      <div className="mb-4 flex gap-2">
        {['men','women','kids'].map(t => (
          <button
            key={t}
            className={`px-4 py-2 rounded-full border ${category === t ? 'bg-black text-white' : 'bg-white'}`}
            onClick={() => setParam('category', t)}
          >
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Filters */}
        <aside className="md:col-span-1 border rounded-2xl p-4 h-max">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Filters</h2>
            <button className="text-sm underline" onClick={clearFilters}>Clear</button>
          </div>

          {/* Name */}
          <div className="mb-3">
            <label className="text-sm block mb-1">Name</label>
            <input
              className="w-full border rounded-lg px-3 py-2"
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
                    className={`px-2 py-1 rounded border text-sm ${active ? 'bg-black text-white' : 'bg-white'}`}
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
                className="w-1/2 border rounded-lg px-3 py-2"
                placeholder="Min"
                value={priceMin}
                onChange={e => setParam('priceMin', e.target.value)}
              />
              <input
                type="number"
                className="w-1/2 border rounded-lg px-3 py-2"
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
              className="w-full border rounded-lg px-3 py-2"
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
              className="w-full border rounded-lg px-3 py-2"
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
                    className={`px-2 py-1 rounded border text-sm ${active ? 'bg-black text-white' : 'bg-white'}`}
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
                className={`px-2 py-1 rounded border text-sm ${mainTag === 'any' ? 'bg-black text-white' : 'bg-white'}`}
                onClick={() => setParam('mainTag', 'any')}
              >Any</button>
              <button
                className={`px-2 py-1 rounded border text-sm ${mainTag === 'new' ? 'bg-black text-white' : 'bg-white'}`}
                onClick={() => setParam('mainTag', 'new')}
              >New</button>
              <button
                className={`px-2 py-1 rounded border text-sm ${mainTag === 'old' ? 'bg-black text-white' : 'bg-white'}`}
                onClick={() => setParam('mainTag', 'old')}
              >Old</button>
            </div>
          </div>
        </aside>

        {/* Results */}
        <section className="md:col-span-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <h1 className="text-2xl font-bold">
              {category[0].toUpperCase() + category.slice(1)} — Products
            </h1>
            <div className="flex items-center gap-3">
              <select
                className="border rounded-lg px-3 py-2"
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
            <div className="mt-8 border rounded-2xl p-6 text-center text-sm opacity-80">
              No products found for this selection. Try another tab or clear filters.
            </div>
          )}

          <div className="grid gap-6 mt-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {items.map(p => {
              const isFav = favSlugs.has(p.slug)
              return (
                <Link key={p._id || p.id} to={`/products/${p.slug}`} className="group border rounded-2xl overflow-hidden hover:shadow-sm transition relative">
                  <button
                    aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
                    onClick={(e) => toggleFavorite(e, p.slug)}
                    className={`absolute right-2 top-2 rounded-full border px-2 py-1 text-lg bg-white/90 ${isFav ? 'text-red-600' : 'text-gray-700'}`}
                    title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    {isFav ? '♥' : '♡'}
                  </button>
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
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
