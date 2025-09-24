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
    <Link to={`/products/${p.slug}`} className="group card product-card card-hover overflow-hidden block animate-fade-in-up hover-lift">
      <div className="product-img relative">
        <img src={p.images?.[0]} alt={p.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" decoding="async" />
        {/* Tags positioned on image */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {p.mainTags?.includes('new') && <Badge tone="green" className="animate-bounce-in">New</Badge>}
        </div>
        {/* Discount tag on right side */}
        {p.discountPercent > 0 && (
          <div className="absolute top-2 right-2">
            <Badge tone="red" className="animate-pulse-glow">-{p.discountPercent}%</Badge>
          </div>
        )}
        {/* Overlay gradient on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
      <div className="card-body space-y-3 p-4">
        <div>
          <div className="card-title leading-snug line-clamp-2 mb-1 group-hover:text-[--color-brand-600] transition-colors">{p.name}</div>
          <div className="flex items-center gap-2 text-xs">
            <span className="card-subtitle">Color:</span>
            <div 
              className="w-4 h-4 rounded-full border-2 border-gray-400 shadow-sm transition-transform hover:scale-125"
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
            {p.lowStock ? <Badge tone="red" className="animate-pulse">Low stock</Badge> : p.stock > 0 ? <Badge tone="green">In stock</Badge> : <Badge>Out of stock</Badge>}
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
        {/* Animated background particles */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-3 h-3 bg-[--color-brand-400] rounded-full animate-particle opacity-40 shadow-glow" />
          <div className="absolute top-1/3 right-1/3 w-2 h-2 bg-[--color-cyan-400] rounded-full animate-particle opacity-50" style={{animationDelay: '1s'}} />
          <div className="absolute bottom-1/4 left-1/3 w-2.5 h-2.5 bg-[--color-pink-400] rounded-full animate-particle opacity-45" style={{animationDelay: '2s'}} />
          <div className="absolute top-1/2 right-1/4 w-2 h-2 bg-[--color-brand-500] rounded-full animate-particle opacity-35" style={{animationDelay: '0.5s'}} />
          <div className="absolute bottom-1/3 right-1/2 w-1.5 h-1.5 bg-[--color-orange-400] rounded-full animate-particle opacity-40" style={{animationDelay: '1.5s'}} />
          <div className="absolute top-3/4 left-1/2 w-1 h-1 bg-[--color-cyan-300] rounded-full animate-particle opacity-30" style={{animationDelay: '2.5s'}} />
        </div>
        <div className="container-app pt-4 md:pt-8 pb-16">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div className="animate-fade-in-up space-lg">
              <h1 className="text-5xl md:text-7xl font-black leading-tight gradient-text mb-4 animate-gradient">
                Dress & Go — Fresh fits for every day.
              </h1>
              <p className="text-lg text-[--color-muted] max-w-prose leading-relaxed animate-slide-up" style={{animationDelay: '0.2s'}}>
                Discover the latest arrivals, most-loved styles, and essentials for Men, Women, and Kids.
              </p>

              {/* Search bar */}
              <form onSubmit={onSubmitSearch} className="mt-6 relative animate-slide-up" style={{animationDelay: '0.4s'}} ref={suggestBoxRef}>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setShowSuggest(true) }}
                  onFocus={() => setShowSuggest(true)}
                  placeholder="Search products…"
                  className="input w-full md:w-96 glass-card"
                  aria-label="Search products"
                />
                {/* Suggestions */}
                {showSuggest && (suggest?.length > 0) && (
                  <div className="absolute z-10 mt-2 w-full md:w-96 glass-card rounded-xl shadow-lg overflow-hidden animate-scale-in">
                    {suggest.map((item, index) => (
                      <button
                        type="button"
                        key={item.id}
                        className="w-full text-left px-3 py-2 hover:bg-white/20 flex items-center gap-3 transition-all duration-200 hover:transform hover:scale-[1.02]"
                        onClick={() => navigate(`/products/${item.slug}`)}
                        aria-label={`Go to ${item.name}`}
                        style={{animationDelay: `${index * 0.05}s`}}
                      >
                        <img src={item.images?.[0]} alt="" className="w-10 h-10 object-cover rounded transition-transform hover:scale-110" />
                        <div className="flex-1">
                          <div className="text-sm font-medium line-clamp-1">{item.name}</div>
                          <div className="text-xs text-[--color-muted]">
                            Rs. {Number(item.finalPrice ?? item.price).toLocaleString()}
                          </div>
                        </div>
                      </button>
                    ))}
                    <div className="border-t border-white/20">
                      <button
                        type="submit"
                        className="w-full text-left px-3 py-2 hover:bg-white/20 text-sm transition-all duration-200"
                        aria-label="See all search results"
                      >
                        See all results
                      </button>
                    </div>
                  </div>
                )}
              </form>

              {/* CTAs */}
              <div className="flex items-center gap-md mt-10 animate-slide-up" style={{animationDelay: '0.6s'}}>
                <Link to="/products" className="btn btn-primary animate-pulse-glow hover-bounce">
                  <Search size={20} className="icon-bounce" /> Shop Now
                </Link>
                <Link to="/about" className="btn btn-secondary hover-glow glass">About</Link>
                <a href="#browse" className="text-base font-semibold inline-flex items-center gap-2 hover-lift text-[--color-brand-600] transition-all duration-300">
                  Scroll down <ArrowRight size={16} className="icon-bounce" />
                </a>
              </div>

              {/* Quick filter chips */}
              <div className="chips mt-6 animate-slide-up" style={{animationDelay: '0.8s'}}>
                {[
                  { label: 'New', to: `/products?category=${category}&mainTag=new` },
                  { label: 'Discounts', to: `/products?category=${category}&tags=discount` },
                  { label: 'Limited', to: `/products?category=${category}&tags=limited` },
                  { label: 'Best sellers', to: `/products?category=${category}&tags=bestseller` },
                ].map((c, index) => (
                  <Link 
                    key={c.label} 
                    to={c.to} 
                    className="chip hover-lift glass transition-all duration-300 hover:glass-card animate-bounce-in"
                    style={{animationDelay: `${0.9 + index * 0.1}s`}}
                  >
                    {c.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Hero image */}
            <div className="hidden lg:block animate-float">
              <div className="aspect-[4/3] rounded-3xl overflow-hidden shadow-glow bg-mesh hover-lift glass-card animate-scale-in" style={{animationDelay: '0.3s'}}>
                <img
                  src="/image/hero%20image.png"
                  alt="Hero"
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                  loading="eager"
                />
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-[--color-brand-500]/15 to-[--color-cyan-500]/15 opacity-0 hover:opacity-100 transition-opacity duration-500" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BROWSE / HIGHLIGHTS */}
      <section id="browse" className="container-app m-section">
        {/* Category tabs */}
        <div className="flex gap-md mb-8 justify-center animate-fade-in-up">
          {['men','women','kids'].map((t, index) => (
            <button
              key={t}
              className={`btn ${category === t ? 'btn-primary shadow-glow animate-scale-in glass-card' : 'btn-outline glass'} hover-lift px-8 py-4 transition-all duration-300 animate-bounce-in`}
              onClick={() => setCategory(t)}
              style={{animationDelay: `${index * 0.1}s`}}
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
            {/* Deal spotlight */}
            {(topRated?.[0] || latest?.[0]) && (
              <div className="mt-10 card">
                <div className="card-body flex flex-col md:flex-row items-start md:items-center gap-6">
                  <img src={(topRated?.[0] || latest?.[0])?.images?.[0]} alt="Spotlight" className="w-full md:w-56 h-40 object-cover rounded-[--radius-lg]" loading="lazy" decoding="async" />
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-1">Editor’s pick</h3>
                    <p className="text-sm text-[--color-muted]">A standout piece people love right now.</p>
                  </div>
                  <Link className="btn btn-primary" to={`/products/${(topRated?.[0] || latest?.[0])?.slug}`}>View product</Link>
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
                <div className="grid gap-6 mt-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
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
                <div className="grid gap-6 mt-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
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
                <div className="grid gap-6 mt-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
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
                <div className="grid gap-6 mt-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
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
