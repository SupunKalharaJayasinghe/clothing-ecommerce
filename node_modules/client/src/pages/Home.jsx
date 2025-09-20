import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../lib/axios'
import useDebounce from '../hooks/useDebounce'
import { Search, ArrowRight } from '../lib/icons'
import Price from '../components/ui/Price'
import Stars from '../components/ui/Stars'
import Badge from '../components/ui/Badge'
import { getColorValue } from '../lib/colors'

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
  const [loadingHL, setLoadingHL] = useState(true)
  const [errHL, setErrHL] = useState('')

  // Fetch highlights when category changes
  useEffect(() => {
    (async () => {
      setLoadingHL(true); setErrHL('')
      try {
        const { data } = await api.get('/products/highlights', { params: { category, limit: 8 } })
        setLatest(data.latest || [])
        setTopRated(data.topRated || [])
        setPopular(data.popular || [])
      } catch (e) {
        setErrHL(e.response?.data?.message || e.message)
      } finally {
        setLoadingHL(false)
      }
    })()
  }, [category])

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
    () => (latest?.length || 0) + (topRated?.length || 0) + (popular?.length || 0) > 0,
    [latest, topRated, popular]
  )

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
        <div className="absolute inset-0 pointer-events-none" />
        <div className="container-app pt-4 md:pt-8 pb-16">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div className="animate-slide-up space-lg">
              <h1 className="text-5xl md:text-7xl font-black leading-tight gradient-text mb-4">
                Dress & Go — Fresh fits for every day.
              </h1>
              <p className="text-lg text-[--color-muted] max-w-prose leading-relaxed">
                Discover the latest arrivals, most-loved styles, and essentials for Men, Women, and Kids.
              </p>

              {/* Search bar */}
              <form onSubmit={onSubmitSearch} className="mt-6 relative" ref={suggestBoxRef}>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setShowSuggest(true) }}
                  onFocus={() => setShowSuggest(true)}
                  placeholder="Search products…"
                  className="input w-full md:w-96"
                  aria-label="Search products"
                />
                {/* Suggestions */}
                {showSuggest && (suggest?.length > 0) && (
                  <div className="absolute z-10 mt-2 w-full md:w-96 bg-white border rounded-xl shadow-lg overflow-hidden">
                    {suggest.map(item => (
                      <button
                        type="button"
                        key={item.id}
                        className="w-full text-left px-3 py-2 hover:bg-[--color-bg-soft] flex items-center gap-3"
                        onClick={() => navigate(`/products/${item.slug}`)}
                        aria-label={`Go to ${item.name}`}
                      >
                        <img src={item.images?.[0]} alt="" className="w-10 h-10 object-cover rounded" />
                        <div className="flex-1">
                          <div className="text-sm font-medium line-clamp-1">{item.name}</div>
                          <div className="text-xs text-[--color-muted]">
                            Rs. {Number(item.finalPrice ?? item.price).toLocaleString()}
                          </div>
                        </div>
                      </button>
                    ))}
                    <div className="border-t">
                      <button
                        type="submit"
                        className="w-full text-left px-3 py-2 hover:bg-[--color-bg-soft] text-sm"
                        aria-label="See all search results"
                      >
                        See all results
                      </button>
                    </div>
                  </div>
                )}
              </form>

              {/* CTAs */}
              <div className="flex items-center gap-md mt-10">
                <Link to="/products" className="btn btn-primary animate-pulse-glow hover-bounce">
                  <Search size={20} /> Shop Now
                </Link>
                <Link to="/about" className="btn btn-secondary hover-glow">About</Link>
                <a href="#browse" className="text-base font-semibold inline-flex items-center gap-2 hover-lift text-[--color-brand-600]">
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
                ].map((c) => (
                  <Link key={c.label} to={c.to} className="chip hover-lift">{c.label}</Link>
                ))}
              </div>
            </div>

            {/* Hero image */}
            <div className="hidden lg:block animate-float">
              <div className="aspect-[4/3] rounded-3xl overflow-hidden shadow-glow bg-mesh hover-lift">
                <img
                  src="https://images.unsplash.com/photo-1520975922203-bc4e16f6f3a0?q=80&w=1600&auto=format&fit=crop"
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
          {['men','women','kids'].map(t => (
            <button
              key={t}
              className={`btn ${category === t ? 'btn-primary shadow-glow animate-scale-in' : 'btn-outline'} hover-lift px-8 py-4`}
              onClick={() => setCategory(t)}
            >
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Featured categories */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          {[
            { label: 'Men', key: 'men', img: 'https://images.unsplash.com/photo-1617137968427-85924c800a3f?q=60&w=1200&auto=format&fit=crop' },
            { label: 'Women', key: 'women', img: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=60&w=1200&auto=format&fit=crop' },
            { label: 'Kids', key: 'kids', img: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=60&w=1200&auto=format&fit=crop' },
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
