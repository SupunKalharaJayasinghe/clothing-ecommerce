import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../lib/axios'
import useDebounce from '../hooks/useDebounce'
import { Search, ArrowRight } from '../lib/icons'
import Price from '../components/ui/Price'
import Stars from '../components/ui/Stars'
import Badge from '../components/ui/Badge'
import { getColorValue } from '../lib/colors'
import { getProductRating, getProductReviewsCount } from '../lib/product'

function Card({ p }) {
  return (
    <Link to={`/products/${p.slug}`} className="group card product-card card-hover overflow-hidden block">
      <div className="product-img relative">
        <img src={p.images?.[0]} alt={p.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
        {/* Tags positioned on image */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {p.mainTags?.includes('new') && <Badge tone="green">New</Badge>}
        </div>
        {/* Discount tag on right side */}
        {p.discountPercent > 0 && (
          <div className="absolute top-2 right-2">
            <Badge tone="red">-{p.discountPercent}%</Badge>
          </div>
        )}
        {/* Overlay gradient on hover (no pointer capture) */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      </div>
      <div className="card-body space-y-3 p-4">
        <div>
          <div className="card-title leading-snug line-clamp-2 mb-1 group-hover:text-[--color-brand-600] transition-colors">{p.name}</div>
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
            <Stars rating={getProductRating(p)} />
            <span className="opacity-70">({getProductReviewsCount(p)})</span>
          </div>
          <div className="text-right">
            {p.lowStock ? <Badge tone="red">Low stock</Badge> : p.stock > 0 ? <Badge tone="green">In stock</Badge> : <Badge>Out of stock</Badge>}
          </div>
        </div>
      </div>
    </Link>
  )
}

export default function Home() {
  // HERO search
  const [query, setQuery] = useState('')
  const debouncedQ = useDebounce(query, 300)
  const [suggest, setSuggest] = useState([])
  const [showSuggest, setShowSuggest] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const suggestBoxRef = useRef(null)
  const navigate = useNavigate()

  // Category tab for showcases
  const [category, setCategory] = useState('men')

  // Highlights
  const [latest, setLatest] = useState([])
  const [topRated, setTopRated] = useState([])
  const [popular, setPopular] = useState([])
  const [topRatedAll, setTopRatedAll] = useState([]) // new: across all categories
  const [loadingHL, setLoadingHL] = useState(true)
  const [errHL, setErrHL] = useState('')

  // Fetch highlights when category changes
  useEffect(() => {
    const ctrl = new AbortController()
    let cancelled = false
    ;(async () => {
      setLoadingHL(true); setErrHL('')
      try {
        const { data } = await api.get('/products/highlights', { params: { category, limit: 8 }, signal: ctrl.signal })
        if (cancelled) return
        setLatest(data.latest || [])
        setTopRated(data.topRated || [])
        setPopular(data.popular || [])
      } catch (e) {
        if (!cancelled && e.name !== 'CanceledError' && e.code !== 'ERR_CANCELED') {
          setErrHL(e.response?.data?.message || e.message)
        }
      } finally {
        if (!cancelled) setLoadingHL(false)
      }
    })()
    return () => { cancelled = true; ctrl.abort() }
  }, [category])

  // Fetch Top Rated across ALL categories (independent of selected tab)
  useEffect(() => {
    const ctrl = new AbortController()
    let cancelled = false
    ;(async () => {
      try {
        // Ask API for top rated across all categories
        const { data } = await api.get('/products', { params: { sort: 'rating', category: 'all', page: 1, limit: 100 }, signal: ctrl.signal })
        // Strict client-side enforcement: rated only, highest → lowest by numeric rating
        let items = Array.isArray(data.items) ? data.items : []
        items = items.filter(it => {
          const r = getProductRating(it)
          return Number.isFinite(r) && r > 0
        })
        items.sort((a, b) => getProductRating(b) - getProductRating(a))
        if (!cancelled) setTopRatedAll(items.slice(0, 8))
      } catch (_) {
        if (!cancelled) setTopRatedAll([])
      }
    })()
    return () => { cancelled = true; ctrl.abort() }
  }, [])

  // Fetch suggestions as user types
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!debouncedQ) { setSuggest([]); return }
      try {
        const { data } = await api.get('/products/suggest', { params: { q: debouncedQ } })
        if (!cancelled) setSuggest(data.items || [])
      } catch {
        if (!cancelled) setSuggest([])
      }
    })()
    return () => { cancelled = true }
  }, [debouncedQ])

  // Close suggest on outside click
  useEffect(() => {
    function onDocClick(e) {
      if (!suggestBoxRef.current) return
      if (!suggestBoxRef.current.contains(e.target)) setShowSuggest(false)
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [])

  // Reset or clamp highlighted index when suggestions change
  useEffect(() => {
    if (!showSuggest || !suggest?.length) {
      setHighlightIndex(-1)
    } else if (highlightIndex >= suggest.length) {
      setHighlightIndex(suggest.length - 1)
    }
  }, [suggest, showSuggest])

  const hasAny = useMemo(
    () => (latest?.length || 0) + (topRated?.length || 0) + (popular?.length || 0) + (topRatedAll?.length || 0) > 0,
    [latest, topRated, popular, topRatedAll]
  )

  // Strict derived list for Top Rated All Products
  const topRatedAllSorted = useMemo(() => {
    return (topRatedAll || [])
      .filter(p => Number.isFinite(getProductRating(p)) && getProductRating(p) > 0)
      .slice() // copy
      .sort((a, b) => getProductRating(b) - getProductRating(a))
  }, [topRatedAll])

  function onSubmitSearch(e) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    params.set('category', category)
    navigate(`/products?${params.toString()}`)
  }

  return (
    <div className="min-h-dvh">
      {/* HERO */}
      <section className="hero section relative overflow-hidden">
        <div className="container-app pt-4 md:pt-8 pb-16">
          <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 items-center">
            <div className="space-y-6 lg:space-y-8 text-center lg:text-left">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold leading-tight text-[--color-text-high]">
                Dress & Go — Fresh fits for every day.
              </h1>
              <p className="text-base sm:text-lg text-[--color-text-medium] max-w-prose leading-relaxed mx-auto lg:mx-0">
                Discover the latest arrivals, most-loved styles, and essentials for Men, Women, and Kids.
              </p>

              {/* Search bar */}
              <form onSubmit={onSubmitSearch} className="relative max-w-md mx-auto lg:mx-0 lg:max-w-lg" ref={suggestBoxRef}>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setShowSuggest(true); setHighlightIndex(-1) }}
                  onFocus={() => setShowSuggest(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      e.stopPropagation()
                      setShowSuggest(false)
                      setHighlightIndex(-1)
                    } else if (e.key === 'ArrowDown' && suggest?.length) {
                      e.preventDefault()
                      setShowSuggest(true)
                      setHighlightIndex((prev) => (prev + 1) % suggest.length)
                    } else if (e.key === 'ArrowUp' && suggest?.length) {
                      e.preventDefault()
                      setShowSuggest(true)
                      setHighlightIndex((prev) => (prev <= 0 ? suggest.length - 1 : prev - 1))
                    } else if (e.key === 'Enter' && highlightIndex >= 0 && suggest?.[highlightIndex]) {
                      e.preventDefault()
                      navigate(`/products/${suggest[highlightIndex].slug}`)
                      setShowSuggest(false)
                      setHighlightIndex(-1)
                    }
                  }}
                  placeholder="Search products…"
                  className="input w-full glass-card text-base"
                  aria-label="Search products"
                  autoComplete="off"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-controls="search-suggest"
                  aria-expanded={showSuggest && (suggest?.length > 0)}
                  aria-activedescendant={highlightIndex >= 0 && suggest?.[highlightIndex] ? `suggestion-${suggest[highlightIndex].id}` : undefined}
                />
                {showSuggest && (suggest?.length > 0) && (
                  <div className="sr-only" aria-live="polite">{suggest.length} suggestions available</div>
                )}
                {/* Suggestions */}
                {showSuggest && (suggest?.length > 0) && (
                  <ul
                    id="search-suggest"
                    role="listbox"
                    aria-label="Search suggestions"
                    className="absolute z-10 mt-2 w-full glass-card rounded-xl shadow-md overflow-hidden"
                  >
                    {suggest.map((item, index) => (
                      <li id={`suggestion-${item.id}`} key={item.id} role="option" aria-selected={highlightIndex === index}>
                        <button
                          type="button"
                          className={`w-full text-left px-3 py-2 flex items-center gap-3 transition-colors duration-150 ${highlightIndex === index ? 'bg-[--color-bg-soft]' : 'hover:bg-[--color-bg-soft]'}`}
                          onClick={() => navigate(`/products/${item.slug}`)}
                          aria-label={`Go to ${item.name}`}
                          onMouseEnter={() => setHighlightIndex(index)}
                        >
                          <img src={item.images?.[0]} alt="" className="w-10 h-10 object-cover rounded" />
                          <div className="flex-1">
                            <div className="text-sm font-medium line-clamp-1">{item.name}</div>
                            <div className="text-xs text-[--color-muted]">
                              Rs. {Number(item.finalPrice ?? item.price).toLocaleString()}
                            </div>
                          </div>
                        </button>
                      </li>
                    ))}
                    <li className="border-t border-[--color-border]">
                      <button
                        type="submit"
                        className="w-full text-left px-3 py-2 hover:bg-[--color-bg-soft] text-sm transition-colors duration-150"
                        aria-label="See all search results"
                      >
                        See all results
                      </button>
                    </li>
                  </ul>
                )}
              </form>

              {/* CTAs */}
              <div className="flex items-center gap-md mt-10">
                <Link to="/products" className="btn btn-primary">
                  <Search size={20} /> Shop Now
                </Link>
                <Link to="/about" className="btn btn-secondary">About</Link>
                <a href="#browse" className="text-base font-semibold inline-flex items-center gap-2 text-[--color-brand-600]">
                  Scroll down <ArrowRight size={16} />
                </a>
              </div>

              {/* Quick filter chips */}
              <div className="chips mt-6">
                {[
                  { label: 'New', to: `/products?category=${category}&mainTag=new` },
                  { label: 'Discounts', to: `/products?category=${category}&tags=discount` },
                  { label: 'Limited', to: `/products?category=${category}&tags=limited` },
                  { label: 'Best sellers', to: `/products?category=${category}&tags=bestseller` },
                ].map((c, index) => (
                  <Link 
                    key={c.label} 
                    to={c.to} 
                    className="chip"
                  >
                    {c.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Hero image */}
            <div className="hidden lg:block">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden border bg-white shadow-sm">
                <img
                  src="/image/hero%20image.png"
                  alt="Hero"
                  className="w-full h-full object-cover"
                  loading="eager"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BROWSE / HIGHLIGHTS */}
      <section id="browse" className="container-app m-section">
        {/* Category tabs */}
        <div className="flex gap-md mb-8 justify-center">
          {['men','women','kids'].map((t) => (
            <button
              key={t}
              className={`btn ${category === t ? 'btn-primary' : 'btn-outline'} px-8 py-3`}
              aria-pressed={category === t}
              onClick={() => setCategory(t)}
            >
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Featured categories */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          {[
            { label: 'Men', key: 'men', img: '/image/men.png' },
            { label: 'Women', key: 'women', img: '/image/women.png' },
            { label: 'Kids', key: 'kids', img: '/image/kids.png' },
          ].map(cat => (
            <Link key={cat.key} to={`/products?category=${cat.key}`} className="category-card is-overlay">
              <div className="img-wrap">
                <img src={cat.img} alt={`${cat.label} category`} loading="lazy" decoding="async" />
                <div className="overlay" />
                <div className="caption">
                  <div className="font-semibold">{cat.label}</div>
                  <span className="cta">Shop now →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {loadingHL && (
          <div className="mt-8 skel-grid">
            {Array.from({ length: 8 }).map((_, i) => (
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
        {errHL && (
          <div className="card card-body text-sm text-red-600 mt-8">{errHL}</div>
        )}

        {!loadingHL && hasAny && (
          <>
            {/* Enhanced Deal spotlight */}
            {(topRated?.[0] || latest?.[0]) && (
              <div className="mt-10 relative overflow-hidden rounded-2xl bg-gradient-to-br from-[--color-surface] to-[--color-surface-elevated] backdrop-blur-xl shadow-lg">
                {/* Decorative gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-[--color-brand-600]/5 via-transparent to-[--color-cyan-500]/5 pointer-events-none"></div>
                
                <div className="relative p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
                  {/* Enhanced product image */}
                  <div className="relative group">
                    <div className="w-full md:w-64 h-48 md:h-56 rounded-xl overflow-hidden bg-[--color-surface-glass] backdrop-blur-sm">
                      <img 
                        src={(topRated?.[0] || latest?.[0])?.images?.[0]} 
                        alt="Editor's pick product" 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        loading="lazy" 
                        decoding="async" 
                      />
                      {/* Featured badge inside image */}
                      <div className="absolute top-3 right-3 bg-gradient-to-r from-[--color-brand-600] to-[--color-brand-500] text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg backdrop-blur-sm">
                        ⭐ Featured
                      </div>
                    </div>
                  </div>
                  
                  {/* Enhanced content */}
                  <div className="flex-1 space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-gradient-to-r from-[--color-brand-500] to-[--color-cyan-500] rounded-full animate-pulse"></div>
                        <span className="text-xs font-semibold text-[--color-brand-400] uppercase tracking-wider">Editor's Choice</span>
                      </div>
                      <h3 className="text-2xl md:text-3xl font-bold text-[--color-text-high] leading-tight">
                        {(topRated?.[0] || latest?.[0])?.name || "Editor's pick"}
                      </h3>
                      <p className="text-[--color-text-medium] leading-relaxed">
                        A standout piece that's capturing everyone's attention right now. Carefully selected for its exceptional quality and style.
                      </p>
                    </div>
                    
                    {/* Product details */}
                    <div className="flex items-center gap-4 pt-2">
                      <div className="flex items-center gap-1">
                        <Stars rating={getProductRating(topRated?.[0] || latest?.[0])} />
                        <span className="text-sm text-[--color-text-medium]">
                          ({getProductReviewsCount(topRated?.[0] || latest?.[0])})
                        </span>
                      </div>
                      <div className="text-lg font-bold text-[--color-brand-400]">
                        <Price 
                          price={(topRated?.[0] || latest?.[0])?.price} 
                          discountPercent={(topRated?.[0] || latest?.[0])?.discountPercent} 
                          finalPrice={(topRated?.[0] || latest?.[0])?.finalPrice ?? (topRated?.[0] || latest?.[0])?.price} 
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Enhanced CTA */}
                  <div className="flex flex-col gap-3 md:items-end">
                    <Link 
                      className="btn btn-primary px-6 py-3 text-base font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200" 
                      to={`/products/${(topRated?.[0] || latest?.[0])?.slug}`}
                    >
                      View Product
                      <ArrowRight size={18} />
                    </Link>
                    <span className="text-xs text-[--color-text-medium] opacity-75">Limited time spotlight</span>
                  </div>
                </div>
              </div>
            )}

            {/* Latest */}
            {latest?.length > 0 && (
              <div className="mt-10">
                <div className="flex items-baseline justify-between">
                  <h2 className="section-title text-2xl">Latest Drops</h2>
                  <Link to={`/products?category=${category}&sort=new`} className="btn btn-ghost">View all</Link>
                </div>
                <div className="grid gap-4 mt-3 grid-cols-1 sm:grid-cols-1 md:grid-cols-3 lg:grid-cols-3">
                  {latest.map(p => <Card key={p.id || p._id} p={p} />)}
                </div>
              </div>
            )}

            {/* Top Rated */}
            {topRated?.length > 0 && (
              <div className="mt-12">
                <div className="flex items-baseline justify-between">
                  <h2 className="section-title text-2xl">Top Rated</h2>
                  <Link to={`/products?category=${category}&sort=rating`} className="btn btn-ghost">View all</Link>
                </div>
                <div className="grid gap-4 mt-3 grid-cols-1 sm:grid-cols-1 md:grid-cols-3 lg:grid-cols-3">
                  {topRated.map(p => <Card key={p.id || p._id} p={p} />)}
                </div>
              </div>
            )}

            {/* Top Rated All Products */}
            {topRatedAll?.length > 0 && (
              <div className="mt-12">
                <div className="flex items-baseline justify-between">
                  <h2 className="section-title text-2xl">Top Rated All Products</h2>
                  <Link to={`/products?category=all&sort=rating`} className="btn btn-ghost">View all</Link>
                </div>
                <div className="grid gap-4 mt-3 grid-cols-1 sm:grid-cols-1 md:grid-cols-3 lg:grid-cols-3">
                  {topRatedAllSorted.map(p => <Card key={p.id || p._id} p={p} />)}
                </div>
              </div>
            )}

            {/* Most Popular */}
            {popular?.length > 0 && (
              <div className="mt-12">
                <div className="flex items-baseline justify-between">
                  <h2 className="section-title text-2xl">Trending Now</h2>
                  <Link to={`/products?category=${category}`} className="btn btn-ghost">View all</Link>
                </div>
                <div className="grid gap-4 mt-3 grid-cols-1 sm:grid-cols-1 md:grid-cols-3 lg:grid-cols-3">
                  {popular.map(p => <Card key={p.id || p._id} p={p} />)}
                </div>
              </div>
            )}
          </>
        )}

        {!loadingHL && !hasAny && (
          <div className="card card-body text-sm opacity-80 mt-8">
            No products to show here yet. Try another tab or check back later.
          </div>
        )}
      </section>
    </div>
  )
}
