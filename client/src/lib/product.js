export function getProductRating(p) {
  // Try common average rating fields first
  let val = (
    p?.rating ??
    p?.ratingAvg ??
    p?.averageRating ??
    p?.avgRating ??
    p?.rating_average ??
    p?.ratingsAverage ??
    p?.ratings_avg
  )

  let num = Number(val)

  // If missing or invalid, try to derive from reviews array
  if (!Number.isFinite(num) || num <= 0) {
    if (Array.isArray(p?.reviews) && p.reviews.length > 0) {
      const arr = p.reviews.map(r => Number(r?.rating)).filter(x => Number.isFinite(x))
      if (arr.length > 0) {
        const sum = arr.reduce((a, b) => a + b, 0)
        num = sum / arr.length
      }
    }
  }

  // Clamp to [0,5]
  if (!Number.isFinite(num)) num = 0
  num = Math.max(0, Math.min(5, num))
  return num
}

export function getProductReviewsCount(p) {
  return (
    p?.reviewsCount ??
    p?.reviewCount ??
    p?.reviews_count ??
    p?.numReviews ??
    (Array.isArray(p?.reviews) ? p.reviews.length : 0) ??
    0
  )
}
