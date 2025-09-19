import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../lib/axios'
import { useAppSelector } from '../app/hooks'

function Price({ price, discountPercent, finalPrice }) {
  if (discountPercent > 0) {
    return (
      <div className="flex items-baseline gap-3">
        <span className="text-2xl font-semibold">Rs. {finalPrice.toLocaleString()}</span>
        <span className="line-through opacity-70">Rs. {price.toLocaleString()}</span>
        <span className="text-xs bg-red-100 text-red-700 rounded px-2 py-0.5">-{discountPercent}%</span>
      </div>
    )
  }
  return <div className="text-2xl font-semibold">Rs. {price.toLocaleString()}</div>
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

function StarInput({ value, onChange, size='text-2xl' }) {
  return (
    <div className={`text-yellow-500 ${size}`} role="radiogroup" aria-label="Choose rating">
      {[1,2,3,4,5].map(n => (
        <button
          key={n}
          type="button"
          className="mr-1"
          aria-checked={value === n}
          onClick={() => onChange(n)}
          title={`${n} star${n>1?'s':''}`}
        >
          {n <= value ? '★' : '☆'}
        </button>
      ))}
    </div>
  )
}

export default function ProductDetails() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user } = useAppSelector(s => s.auth)

  const [p, setP] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [imgIndex, setImgIndex] = useState(0)

  // reviews state
  const [revPage, setRevPage] = useState(1)
  const [revLimit] = useState(5)
  const [reviews, setReviews] = useState([])
  const [revTotal, setRevTotal] = useState(0)
  const [revLoading, setRevLoading] = useState(true)
  const [revErr, setRevErr] = useState('')

  // my review
  const [myReview, setMyReview] = useState(null)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [sendErr, setSendErr] = useState('')
  const [sendMsg, setSendMsg] = useState('')

  // fetch product
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/products/${slug}`)
        setP(data.product)
      } catch (e) {
        setError(e.response?.data?.message || e.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [slug])

  // fetch reviews (page)
  useEffect(() => {
    (async () => {
      setRevLoading(true); setRevErr('')
      try {
        const { data } = await api.get(`/products/${slug}/reviews`, { params: { page: revPage, limit: revLimit } })
        if (revPage === 1) {
          setReviews(data.items)
        } else {
          setReviews(prev => [...prev, ...data.items])
        }
        setRevTotal(data.total)
      } catch (e) {
        setRevErr(e.response?.data?.message || e.message)
      } finally {
        setRevLoading(false)
      }
    })()
  }, [slug, revPage, revLimit])

  // fetch my review
  useEffect(() => {
    if (!user) { setMyReview(null); setRating(0); setComment(''); return }
    (async () => {
      try {
        const { data } = await api.get(`/products/${slug}/reviews/me`)
        setMyReview(data.review)
        if (data.review) { setRating(data.review.rating); setComment(data.review.comment) }
      } catch {
        // ignore (user might have no review)
      }
    })()
  }, [slug, user])

  if (loading) return <div className="p-6">Loading…</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>
  if (!p) return <div className="p-6">Not found</div>

  const currentImg = p.images?.[imgIndex] || p.images?.[0]
  const canLoadMore = reviews.length < revTotal

  async function submitReview() {
    if (!user) return navigate('/login?next=' + encodeURIComponent(`/products/${slug}`))
    setSendErr(''); setSendMsg('')
    try {
      await api.post(`/products/${slug}/reviews`, { rating, comment })
      setSendMsg('Review saved')
      // refresh product stats & reviews list
      const [prod, list, mine] = await Promise.all([
        api.get(`/products/${slug}`),
        api.get(`/products/${slug}/reviews`, { params: { page: 1, limit: revLimit } }),
        api.get(`/products/${slug}/reviews/me`)
      ])
      setP(prod.data.product)
      setReviews(list.data.items)
      setRevTotal(list.data.total)
      setRevPage(1)
      setMyReview(mine.data.review)
    } catch (e) {
      setSendErr(e.response?.data?.message || e.message)
    }
  }

  async function deleteReview() {
    if (!user) return
    setSendErr(''); setSendMsg('')
    try {
      await api.delete(`/products/${slug}/reviews/me`)
      setSendMsg('Review deleted')
      setRating(0); setComment('')
      const [prod, list] = await Promise.all([
        api.get(`/products/${slug}`),
        api.get(`/products/${slug}/reviews`, { params: { page: 1, limit: revLimit } })
      ])
      setP(prod.data.product)
      setReviews(list.data.items)
      setRevTotal(list.data.total)
      setRevPage(1)
      setMyReview(null)
    } catch (e) {
      setSendErr(e.response?.data?.message || e.message)
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Gallery */}
        <div>
          <div className="aspect-[4/5] bg-gray-50 rounded-2xl overflow-hidden">
            <img src={currentImg} alt={p.name} className="w-full h-full object-cover" />
          </div>
          {p.images?.length > 1 && (
            <div className="mt-3 grid grid-cols-6 md:grid-cols-8 gap-2">
              {p.images.map((img, i) => (
                <button key={i}
                  className={`border rounded-lg overflow-hidden aspect-square ${i===imgIndex ? 'ring-2 ring-black' : ''}`}
                  onClick={() => setImgIndex(i)}>
                  <img src={img} alt={`${p.name} ${i+1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            {p.mainTags?.includes('new') && <Badge tone="green">New</Badge>}
            {p.mainTags?.includes('limited') && <Badge tone="amber">Limited</Badge>}
            {p.mainTags?.includes('bestseller') && <Badge tone="purple">Bestseller</Badge>}
            {p.discountPercent > 0 && <Badge tone="red">-{p.discountPercent}%</Badge>}
          </div>

          <h1 className="text-2xl font-bold">{p.name}</h1>

          <div className="flex items-center gap-2">
            <Stars rating={p.rating} />
            <div className="text-sm opacity-70">({p.reviewsCount} reviews)</div>
          </div>

          <div className="text-sm">Color: <span className="font-medium">{p.color}</span></div>

          <Price price={p.price} discountPercent={p.discountPercent} finalPrice={p.finalPrice ?? p.price} />

          <div className="flex items-center gap-2">
            {p.stock > 0 ? (
              p.lowStock ? <Badge tone="red">Low stock ({p.stock} left)</Badge> : <Badge tone="blue">In stock</Badge>
            ) : <Badge>Out of stock</Badge>}
          </div>

          <p className="text-sm leading-relaxed opacity-90 whitespace-pre-line">{p.description}</p>

          <div className="flex items-center gap-3 pt-2">
            <button className="rounded-lg border px-4 py-2" disabled={p.stock <= 0}>Add to cart</button>
            <button className="rounded-lg border px-4 py-2">Add to favorites</button>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <section className="mt-10 grid gap-6 lg:grid-cols-3">
        {/* Write / Edit Review */}
        <div className="lg:col-span-1 rounded-2xl border p-5 h-max">
          <h2 className="font-semibold mb-2">{myReview ? 'Edit your review' : 'Write a review'}</h2>
          {!user ? (
            <p className="text-sm opacity-80">
              Please <button className="underline" onClick={() => navigate('/login?next=' + encodeURIComponent(`/products/${slug}`))}>log in</button> to review.
            </p>
          ) : (
            <>
              <StarInput value={rating} onChange={setRating} />
              <textarea
                className="mt-2 w-full border rounded-lg px-3 py-2 h-28 focus:outline-none focus:ring-2 focus:ring-black/10"
                placeholder="Share your experience with this product…"
                value={comment}
                onChange={e => setComment(e.target.value)}
              />
              {sendErr && <p className="text-red-600 text-sm mt-1">{sendErr}</p>}
              {sendMsg && <p className="text-green-600 text-sm mt-1">{sendMsg}</p>}
              <div className="mt-2 flex items-center gap-2">
                <button className="rounded-lg border px-3 py-1" onClick={submitReview} disabled={rating < 1 || comment.trim().length < 3}>
                  {myReview ? 'Update review' : 'Submit review'}
                </button>
                {myReview && (
                  <button className="rounded-lg border px-3 py-1" onClick={deleteReview}>
                    Delete
                  </button>
                )}
              </div>
              <p className="text-xs opacity-70 mt-1">You can update or delete your review at any time.</p>
            </>
          )}
        </div>

        {/* Reviews list */}
        <div className="lg:col-span-2 rounded-2xl border p-5">
          <h2 className="font-semibold mb-3">Customer Reviews</h2>

          {revLoading && reviews.length === 0 && <div>Loading reviews…</div>}
          {revErr && <div className="text-red-600">{revErr}</div>}
          {reviews.length === 0 && !revLoading && <div className="opacity-70">No reviews yet. Be the first!</div>}

          <div className="space-y-4">
            {reviews.map((r) => (
              <div key={r.id} className="border rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{r.user?.name || 'User'}</div>
                  <div className="text-xs opacity-70">{new Date(r.createdAt).toLocaleString()}</div>
                </div>
                <div className="mt-1">
                  <Stars rating={r.rating} />
                </div>
                <p className="text-sm mt-1 whitespace-pre-line">{r.comment}</p>
              </div>
            ))}
          </div>

          {canLoadMore && (
            <div className="mt-4">
              <button
                className="rounded-lg border px-4 py-2"
                onClick={() => setRevPage(p => p + 1)}
                disabled={revLoading}
              >
                {revLoading ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
