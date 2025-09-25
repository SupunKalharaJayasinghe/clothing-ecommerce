import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import api from '../lib/axios'
import { useAppSelector } from '../app/hooks'
import Price from '../components/ui/Price'
import Stars from '../components/ui/Stars'
import Badge from '../components/ui/Badge'
import { getColorValue } from '../lib/colors'

 

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
  const [fetchingMore, setFetchingMore] = useState(false)
  const [error, setError] = useState('')
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAppSelector(s => s.auth)
  const [facets, setFacets] = useState({ colors: [], tags: [], mainTags: [] })
  const [total, setTotal] = useState(0)
  const [showFiltersMobile, setShowFiltersMobile] = useState(false)
  const [page, setPage] = useState(1)
  const [limit] = useState(24)
  const [hasMore, setHasMore] = useState(true)
  const loadMoreRef = useRef(null)

  const q = params.get('q') || ''
  const sort = params.get('sort') || 'new'
  const category = params.get('category') || 'all'
  const color = params.get('color') || ''

  const priceMin = params.get('priceMin') || ''
  const priceMax = params.get('priceMax') || ''
  const ratingMin = params.get('ratingMin') || ''
  const stock = params.get('stock') || 'any'
  const tags = params.get('tags') || ''
  const mainTag = params.get('mainTag') || 'any'

  const qDebounced = useDebounced(q, 350)

  // Reset list when key filters change
  useEffect(() => {
    setItems([])
    setTotal(0)
    setPage(1)
    setHasMore(true)
  }, [qDebounced, sort, category, color, priceMin, priceMax, ratingMin, stock, tags, mainTag])

  // Local UI state for price inputs; only applied when user clicks Filter
  const [priceMinInput, setPriceMinInput] = useState(priceMin)
  const [priceMaxInput, setPriceMaxInput] = useState(priceMax)
  useEffect(() => {
    setPriceMinInput(priceMin)
    setPriceMaxInput(priceMax)
  }, [priceMin, priceMax])

  const priceDirty = (priceMinInput !== priceMin) || (priceMaxInput !== priceMax)

  function applyPriceFilter() {
    const min = priceMinInput === '' ? '' : Math.max(0, Number(priceMinInput))
    const max = priceMaxInput === '' ? '' : Math.max(0, Number(priceMaxInput))
    if (min !== '' && max !== '' && min > max) {
      // If min > max, clamp max up to min to keep a valid range
      setParam('priceMin', String(min))
      setParam('priceMax', String(min))
    } else {
      setParam('priceMin', min === '' ? '' : String(min))
      setParam('priceMax', max === '' ? '' : String(max))
    }
  }

  function resetPriceFilter() {
    setPriceMinInput('')
    setPriceMaxInput('')
    setParam('priceMin', '')
    setParam('priceMax', '')
  }

  // normalize CSV params to lowercase arrays for case-insensitive matching
  const colorList = useMemo(() => color.split(',').filter(Boolean).map(s => s.toLowerCase()), [color])
  const tagList = useMemo(() => tags.split(',').filter(Boolean).map(s => s.toLowerCase()), [tags])

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
    const set = new Set((currentCSV ? currentCSV.split(',').filter(Boolean) : []).map(s => s.toLowerCase()))
    if (set.has(value)) set.delete(value)
    else set.add(value)
    setParam(key, Array.from(set))
  }

  // request cancellation
  const abortRef = useRef(null)

  useEffect(() => {
  const queryKey = JSON.stringify({ q: qDebounced, sort, category, color, priceMin, priceMax, ratingMin, stock, tags, mainTag, page, limit })

    // We cache per page; still allow network fetch for subsequent pages
    if (cache.has(queryKey)) {
      const { items, facets, total } = cache.get(queryKey)
      setItems(prev => page === 1 ? items : [...prev, ...items])
      setFacets(facets)
      setTotal(total)
      setLoading(false)
      // Note: allow network fetch as fresh data below
    }

    setError('')
    if (page === 1) setLoading(true); else setFetchingMore(true)

    if (abortRef.current) abortRef.current.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    ;(async () => {
      try {
        const qp = {
          q: qDebounced || undefined,
          sort,
          category,
          color: color || undefined,
          priceMin: priceMin || undefined,
          priceMax: priceMax || undefined,
          ratingMin: ratingMin || undefined,
          stock,
          tags: tags || undefined,
          mainTag,
          page,
          limit
        }
        let { data } = await api.get('/products', { params: qp, signal: ctrl.signal })
        // fallback: if server rejected (older validation or transient error), try minimal query
        if (!data?.items && !data?.ok) {
          data = (await api.get('/products', { params: { sort, category }, signal: ctrl.signal })).data
        }
        const payload = { items: data.items || [], facets: data.facets || { colors: [], tags: [], mainTags: [] }, total: data.total || 0 }
        cache.set(queryKey, payload)
        setItems(prev => page === 1 ? payload.items : [...prev, ...payload.items])
        setFacets(payload.facets)
        setTotal(payload.total)
        setHasMore((page * limit) < (payload.total || 0))
        setError('')
      } catch (e) {
        if (e.name !== 'CanceledError' && e.code !== 'ERR_CANCELED') {
          try {
            // ultimate fallback: no params
            const { data } = await api.get('/products', { params: { page, limit }, signal: ctrl.signal })
            const payload = { items: data.items || [], facets: data.facets || { colors: [], tags: [], mainTags: [] }, total: data.total || 0 }
            cache.set(queryKey, payload)
            setItems(prev => page === 1 ? payload.items : [...prev, ...payload.items])
            setFacets(payload.facets)
            setTotal(payload.total)
            setHasMore((page * limit) < (payload.total || 0))
            setError('')
          } catch (inner) {
            setError(inner.response?.data?.message || inner.message)
          }
        }
      } finally {
        if (!ctrl.signal.aborted) { setLoading(false); setFetchingMore(false) }
      }
    })()

    return () => ctrl.abort()
  }, [qDebounced, sort, category, color, priceMin, priceMax, ratingMin, stock, tags, mainTag])

  // Infinite scroll observer
  useEffect(() => {
    const el = loadMoreRef.current
    if (!el) return
    const obs = new IntersectionObserver((entries) => {
      const first = entries[0]
      if (first.isIntersecting && hasMore && !loading && !fetchingMore) {
        setPage(p => p + 1)
      }
    }, { rootMargin: '200px' })
    obs.observe(el)
    return () => obs.disconnect()
  }, [hasMore, loading, fetchingMore])


  // favorites button removed on listing; keep UI stateless here

  // no favorite toggle on listing cards (clean, simplified layout)

  function clearFilters() {
    const keep = new URLSearchParams()
    keep.set('category', 'all')
    keep.set('sort', 'new')
    setParams(keep)
  }

  const colorsFacet = (facets.colors || []).filter(Boolean)
  const tagsFacet = (facets.tags || []).filter(t => t && !RESERVED.has(String(t).toLowerCase()))

  return (
    <div className="container-app section">
      {/* Mobile toolbar */}
      <div className="md:hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <button className="btn btn-outline w-full sm:w-auto" onClick={() => setShowFiltersMobile(v => !v)}>
          {showFiltersMobile ? 'Hide filters' : 'Show filters'}
        </button>
        <div className="text-sm text-[--color-text-medium] self-end sm:self-auto">
          {total ? `${total.toLocaleString()} items` : ''}
        </div>
      </div>
      
      {/* Tabs */}
      <div className="mb-6 md:mb-8">
        <div className="flex flex-wrap gap-2">
          {['all','men','women','kids'].map(t => (
            <button
              key={t}
              className={`btn text-sm sm:text-base ${category === t ? 'btn-primary' : 'btn-outline'} flex-1 sm:flex-none min-w-0`}
              onClick={() => setParam('category', t)}
            >
              {t === 'all' ? 'All' : t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Filters */}
        <aside className={`${showFiltersMobile ? '' : 'hidden'} md:block md:col-span-1 card h-max md:sticky md:top-24`}>
          <div className="card-body">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Filters</h2>
            <button className="text-sm underline" onClick={clearFilters}>Clear</button>
            <button className="md:hidden text-sm underline ml-2" onClick={() => setShowFiltersMobile(v => !v)}>
              {showFiltersMobile ? 'Hide' : 'Show'} filters
            </button>
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
                const key = String(c).toLowerCase()
                const active = colorList.includes(key)
                return (
                  <button
                    key={c}
                    className={`btn ${active ? 'btn-primary' : 'btn-outline'} text-sm px-2 py-1`}
                    onClick={() => toggleInList('color', color.toLowerCase(), key)}
                  >
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="inline-block w-3 h-3 rounded-full border"
                        style={{ backgroundColor: getColorValue(c) }}
                        aria-hidden="true"
                      />
                      {c}
                    </span>
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
                value={priceMinInput}
                onChange={e => setPriceMinInput(e.target.value)}
              />
              <input
                type="number"
                className="input w-1/2"
                placeholder="Max"
                value={priceMaxInput}
                onChange={e => setPriceMaxInput(e.target.value)}
              />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <button className="btn btn-primary btn-sm" onClick={applyPriceFilter} disabled={!priceDirty}>Filter</button>
              {(priceMin || priceMax) && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={resetPriceFilter}>Reset</button>
              )}
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

          </div>
        </aside>

        {/* Results */}
        <section className="md:col-span-3">
          {error && (
            <div className="card card-body text-sm text-red-600 mb-4">{error}</div>
          )}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <h1 className="text-2xl md:text-3xl font-bold">
              {(category === 'all' ? 'All' : category[0].toUpperCase() + category.slice(1))} — Products
            </h1>
            <div className="flex items-center gap-3">
              <div className="text-sm text-[--color-muted] hidden md:block">{total ? `Showing ${total.toLocaleString()} items` : ''}</div>
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

          {/* Active filter chips */}
          <div className="chips mt-4">
            {q && <button className="chip" onClick={() => setParam('q','')}>Name: “{q}” ×</button>}
            {colorList.map(c => (
              <button key={c} className="chip" onClick={() => toggleInList('color', color.toLowerCase(), c)}>Color: {c} ×</button>
            ))}
            {ratingMin && <button className="chip" onClick={() => setParam('ratingMin','')}>Rating ≥ {ratingMin} ×</button>}
            {(priceMin || priceMax) && (
              <button className="chip" onClick={resetPriceFilter}>Price {priceMin || 0}–{priceMax || '∞'} ×</button>
            )}
            {stock !== 'any' && <button className="chip" onClick={() => setParam('stock','any')}>Stock: {stock} ×</button>}
            { (q || colorList.length || ratingMin || priceMin || priceMax || stock !== 'any') && (
              <button className="chip" onClick={clearFilters}>Clear all</button>
            )}
          </div>

          {loading && (
            <div className="mt-6 skel-grid">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="skeleton-card">
                  <div className="img" />
                  <div className="text">
                    <div className="line" />
                    <div className="line" style={{ width: '60%' }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && items.length === 0 && (
            <div className="mt-8 card card-body text-center text-sm opacity-80">
              No products found for this selection. Try another tab or clear filters.
            </div>
          )}

          {!loading && items.length > 0 && (
            <div className="product-grid grid gap-3 sm:gap-4 md:gap-6 mt-6 grid-cols-1 sm:grid-cols-1 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3">
              {items.map(p => {
                return (
                  <Link key={p._id || p.id} to={`/products/${p.slug}`} className="group card product-card card-hover overflow-hidden relative">
                  <div className="product-img relative">
                    <img src={p.images?.[0]} alt={p.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
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
          )}

          {/* Sentinel for infinite scroll */}
          <div ref={loadMoreRef} />

          {fetchingMore && (
            <div className="text-center text-sm opacity-70 py-4">Loading more…</div>
          )}
        </section>
      </div>
    </div>
  )
}
