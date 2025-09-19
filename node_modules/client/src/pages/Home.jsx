import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../lib/axios'
import useDebounce from '../hooks/useDebounce'

// Simple price + badges reused from listing
function Price({ price, discountPercent, finalPrice }) {
  if (discountPercent > 0) {
    return (
      <div className="flex items-baseline gap-2">
        <span className="font-semibold">Rs. {Number(finalPrice ?? price).toLocaleString()}</span>
        <span className="line-through text-sm opacity-70">Rs. {Number(price).toLocaleString()}</span>
        <span className="text-xs bg-red-100 text-red-700 rounded px-1 py-0.5">-{discountPercent}%</span>
      </div>
    )
  }
  return <div className="font-semibold">Rs. {Number(price).toLocaleString()}</div>
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

function Card({ p }) {
  return (
    <Link to={`/products/${p.slug}`} className="group border rounded-2xl overflow-hidden hover:shadow-sm transition block">
      <div className="aspect-[4/5] bg-gray-50 overflow-hidden">
        <img src={p.images?.[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
      </div>
      <div className="p-3 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          {p.mainTags?.includes('new') && <Badge tone="green">New</Badge>}
          {p.discountPercent > 0 && <Badge tone="red">-{p.discountPercent}%</Badge>}
        </div>
        <div className="font-medium leading-snug line-clamp-2">{p.name}</div>
        <div className="text-sm opacity-70">Color: {p.color}</div>
        <Price price={p.price} discountPercent={p.discountPercent} finalPrice={p.finalPrice ?? p.price} />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-sm">
            <Stars rating={p.rating} />
            <span className="opacity-70">({p.reviewsCount || 0})</span>
          </div>
          {p.lowStock ? <Badge tone="red">Low stock</Badge> : p.stock > 0 ? <Badge tone="blue">In stock</Badge> : <Badge>Out</Badge>}
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
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-50 via-white to-white pointer-events-none" />
        <div className="mx-auto max-w-7xl px-4 pt-12 pb-16">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <h1 className="text-3xl md:text-5xl font-extrabold leading-tight">
                Dress & Go — Fresh fits for every day.
              </h1>
              <p className="mt-4 text-gray-600 max-w-prose">
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
                  className="w-full md:w-96 border rounded-xl px-4 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                  aria-label="Search products"
                />
                {/* Suggestions */}
                {showSuggest && (suggest?.length > 0) && (
                  <div className="absolute z-10 mt-2 w-full md:w-96 bg-white border rounded-xl shadow-lg overflow-hidden">
                    {suggest.map(item => (
                      <button
                        type="button"
                        key={item.id}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-3"
                        onClick={() => navigate(`/products/${item.slug}`)}
                        aria-label={`Go to ${item.name}`}
                      >
                        <img src={item.images?.[0]} alt="" className="w-10 h-10 object-cover rounded" />
                        <div className="flex-1">
                          <div className="text-sm font-medium line-clamp-1">{item.name}</div>
                          <div className="text-xs text-gray-600">
                            Rs. {Number(item.finalPrice ?? item.price).toLocaleString()}
                          </div>
                        </div>
                      </button>
                    ))}
                    <div className="border-t">
                      <button
                        type="submit"
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                        aria-label="See all search results"
                      >
                        See all results
                      </button>
                    </div>
                  </div>
                )}
              </form>

              {/* CTAs */}
              <div className="mt-6 flex items-center gap-3">
                <Link to="/products" className="px-4 py-2 rounded-lg border bg-black text-white">Shop</Link>
                <Link to="/about" className="px-4 py-2 rounded-lg border">About</Link>
                <a href="#browse" className="ml-2 text-sm underline">Scroll down</a>
              </div>
            </div>

            {/* Hero image */}
            <div className="hidden lg:block">
              <div className="aspect-[4/3] rounded-3xl overflow-hidden border shadow-sm bg-gray-50">
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
      <section id="browse" className="mx-auto max-w-7xl px-4 pb-14">
        {/* Category tabs */}
        <div className="flex gap-2 mb-6">
          {['men','women','kids'].map(t => (
            <button
              key={t}
              className={`px-4 py-2 rounded-full border ${category === t ? 'bg-black text-white' : 'bg-white'}`}
              onClick={() => setCategory(t)}
            >
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {loadingHL && (
          <div className="border rounded-2xl p-6 text-sm">Loading products…</div>
        )}
        {errHL && (
          <div className="border rounded-2xl p-6 text-sm text-red-600">{errHL}</div>
        )}

        {!loadingHL && !hasAny && (
          <div className="border rounded-2xl p-6 text-sm opacity-80">
            No products to show here yet. Try another tab or check back later.
          </div>
        )}

        {/* Latest */}
        {latest?.length > 0 && (
          <div className="mt-6">
            <div className="flex items-baseline justify-between">
              <h2 className="text-xl font-bold">Latest</h2>
              <Link to={`/products?category=${category}&sort=new`} className="text-sm underline">View all</Link>
            </div>
            <div className="grid gap-4 mt-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {latest.map(p => <Card key={p.id || p._id} p={p} />)}
            </div>
          </div>
        )}

        {/* Top Rated */}
        {topRated?.length > 0 && (
          <div className="mt-10">
            <div className="flex items-baseline justify-between">
              <h2 className="text-xl font-bold">Top rated</h2>
              <Link to={`/products?category=${category}&sort=rating`} className="text-sm underline">View all</Link>
            </div>
            <div className="grid gap-4 mt-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {topRated.map(p => <Card key={p.id || p._id} p={p} />)}
            </div>
          </div>
        )}

        {/* Most Popular */}
        {popular?.length > 0 && (
          <div className="mt-10">
            <div className="flex items-baseline justify-between">
              <h2 className="text-xl font-bold">Most popular</h2>
              <Link to={`/products?category=${category}`} className="text-sm underline">View all</Link>
            </div>
            <div className="grid gap-4 mt-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {popular.map(p => <Card key={p.id || p._id} p={p} />)}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
