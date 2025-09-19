import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../lib/axios'
import { useAppSelector, useAppDispatch } from '../app/hooks' // <-- CHANGED
import { addToCart } from '../features/cart/cartSlice'        // <-- NEW

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
  const dispatch = useAppDispatch() // <-- NEW
  const { user } = useAppSelector(s => s.auth)
  const userId = user?.id || user?._id // handle either shape

  const [p, setP] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [imgIndex, setImgIndex] = useState(0)

  // favorites
  const [isFav, setIsFav] = useState(false)

  // reviews state
  const [revPage, setRevPage] = useState(1)
  const [revLimit] = useState(5)
  const [reviews, setReviews] = useState([])
  const [revTotal, setRevTotal] = useState(0)
  const [revLoading, setRevLoading] = useState(true)
  const [revErr, setRevErr] = useState('')

  // my reviews count (for limit 5)
  const [myTotal, setMyTotal] = useState(0)

  // write/edit form
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [editingId, setEditingId] = useState(null) // null means creating a new review
  const [sendErr, setSendErr] = useState('')
  const [sendMsg, setSendMsg] = useState('')
  const formRef = useRef(null)

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

  // favorites initial
  useEffect(() => {
    if (!user) { setIsFav(false); return }
    (async () => {
      try {
        const { data } = await api.get('/favorites/ids')
        setIsFav((data.slugs || []).includes(slug))
      } catch {
        setIsFav(false)
      }
    })()
  }, [user, slug])

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

  // fetch my reviews count
  useEffect(() => {
    if (!user) { setMyTotal(0); return }
    (async () => {
      try {
        const { data } = await api.get(`/products/${slug}/reviews/me`, { params: { page: 1, limit: 1 } })
        setMyTotal(data.total || 0)
      } catch {
        setMyTotal(0)
      }
    })()
  }, [slug, user])

  if (loading) return <div className="p-6">Loading…</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>
  if (!p) return <div className="p-6">Not found</div>

  const currentImg = p.images?.[imgIndex] || p.images?.[0]
  const canLoadMore = reviews.length < revTotal
  const reachedLimit = user && !editingId && myTotal >= 5

  async function toggleFavorite() {
    if (!user) return navigate('/login?next=' + encodeURIComponent(`/products/${slug}`))
    try {
      if (isFav) {
        setIsFav(false)
        await api.delete(`/favorites/${slug}`)
      } else {
        setIsFav(true)
        await api.post(`/favorites/${slug}`)
      }
    } catch {
      setIsFav(prev => !prev) // rollback
    }
  }

  // --- NEW: add to cart handler (adds 1 by default) ---
  function addItem() {
    if (!p) return
    dispatch(addToCart({
      slug: p.slug,
      name: p.name,
      image: p.images?.[0],
      color: p.color,
      price: p.finalPrice ?? p.price,
      quantity: 1
    }))
  }

  function startEdit(review) {
    setEditingId(review.id)
    setRating(review.rating)
    setComment(review.comment)
    setSendErr(''); setSendMsg('')
    // scroll to form
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
  }

  function cancelEdit() {
    setEditingId(null)
    setRating(0)
    setComment('')
    setSendErr(''); setSendMsg('')
  }

  async function submitReview() {
    if (!user) return navigate('/login?next=' + encodeURIComponent(`/products/${slug}`))
    setSendErr(''); setSendMsg('')

    try {
      if (editingId) {
        // update existing
        await api.patch(`/products/${slug}/reviews/${editingId}`, { rating, comment })
        setSendMsg('Review updated')
      } else {
        // create new
        await api.post(`/products/${slug}/reviews`, { rating, comment })
        setSendMsg('Review submitted')
      }

      // refresh product stats, reviews list (first page), and my count
      const [prod, list, myList] = await Promise.all([
        api.get(`/products/${slug}`),
        api.get(`/products/${slug}/reviews`, { params: { page: 1, limit: revLimit } }),
        api.get(`/products/${slug}/reviews/me`, { params: { page: 1, limit: 1 } })
      ])
      setP(prod.data.product)
      setReviews(list.data.items)
      setRevTotal(list.data.total)
      setRevPage(1)
      setMyTotal(myList.data.total || 0)

      // clear form if creating; keep values after update but exit edit mode
      cancelEdit()
    } catch (e) {
      setSendErr(e.response?.data?.message || e.message)
    }
  }

  async function deleteReview(id) {
    if (!user) return
    try {
      await api.delete(`/products/${slug}/reviews/${id}`)
      const [prod, list, myList] = await Promise.all([
        api.get(`/products/${slug}`),
        api.get(`/products/${slug}/reviews`, { params: { page: 1, limit: revLimit } }),
        api.get(`/products/${slug}/reviews/me`, { params: { page: 1, limit: 1 } })
      ])
      setP(prod.data.product)
      setReviews(list.data.items)
      setRevTotal(list.data.total)
      setRevPage(1)
      setMyTotal(myList.data.total || 0)

      // if we were editing this one, reset the form
      if (editingId === id) cancelEdit()
    } catch (e) {
      // optionally show toast
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Gallery */}
        <div className="relative">
          <button
            onClick={toggleFavorite}
            className={`absolute right-3 top-3 z-10 rounded-full border px-3 py-1.5 text-xl bg-white/90 ${isFav ? 'text-red-600' : 'text-gray-700'}`}
            title={isFav ? 'Remove from favorites' : 'Add to favorites'}
            aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
          >
            {isFav ? '♥' : '♡'}
          </button>
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
            <button className="rounded-lg border px-4 py-2" disabled={p.stock <= 0} onClick={addItem}>
              Add to cart
            </button>
            <button className="rounded-lg border px-4 py-2" onClick={toggleFavorite}>
              {isFav ? 'Remove from favorites' : 'Add to favorites'}
            </button>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <section className="mt-10 grid gap-6 lg:grid-cols-3">
        {/* Write / Edit Review */}
        <div ref={formRef} className="lg:col-span-1 rounded-2xl border p-5 h-max">
          <h2 className="font-semibold mb-2">{editingId ? 'Edit your review' : 'Write a review'}</h2>
          {!user ? (
            <p className="text-sm opacity-80">
              Please <button className="underline" onClick={() => navigate('/login?next=' + encodeURIComponent(`/products/${slug}`))}>log in</button> to review.
            </p>
          ) : (
            <>
              {reachedLimit && !editingId && (
                <div className="mb-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                  You have reached the maximum of 5 reviews for this product. You can edit or delete one of your reviews.
                </div>
              )}
              <StarInput value={rating} onChange={setRating} />
              <textarea
                className="mt-2 w-full border rounded-lg px-3 py-2 h-28 focus:outline-none focus:ring-2 focus:ring-black/10"
                placeholder={editingId ? 'Update your review…' : 'Share your experience with this product…'}
                value={comment}
                onChange={e => setComment(e.target.value)}
              />
              {sendErr && <p className="text-red-600 text-sm mt-1">{sendErr}</p>}
              {sendMsg && <p className="text-green-600 text-sm mt-1">{sendMsg}</p>}
              <div className="mt-2 flex items-center gap-2">
                <button
                  className="rounded-lg border px-3 py-1"
                  onClick={submitReview}
                  disabled={rating < 1 || comment.trim().length < 3 || (reachedLimit && !editingId)}
                >
                  {editingId ? 'Save changes' : 'Submit review'}
                </button>
                {editingId && (
                  <button className="rounded-lg border px-3 py-1" onClick={cancelEdit}>
                    Cancel
                  </button>
                )}
              </div>
              <p className="text-xs opacity-70 mt-1">
                {editingId ? 'You are editing an existing review.' : 'You can submit up to 5 reviews for this product.'}
              </p>
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
            {reviews.map((r) => {
              const isOwner = userId && String(r.user?.id) === String(userId)
              return (
                <div key={r.id} className="border rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{r.user?.name || 'User'}</div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-xs opacity-70">{new Date(r.createdAt).toLocaleString()}</span>
                      {isOwner && (
                        <>
                          <button
                            className="rounded border px-2 py-0.5"
                            title="Edit"
                            onClick={() => startEdit(r)}
                          >
                            ✎
                          </button>
                          <button
                            className="rounded border px-2 py-0.5"
                            title="Delete"
                            onClick={() => deleteReview(r.id)}
                          >
                            🗑
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="mt-1">
                    <Stars rating={r.rating} />
                  </div>
                  <p className="text-sm mt-1 whitespace-pre-line">{r.comment}</p>
                </div>
              )
            })}
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
