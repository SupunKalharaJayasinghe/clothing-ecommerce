export default function Stars({ rating = 0, sizeClass = '' }) {
  const r = Math.round((Number(rating) || 0) * 2) / 2
  return (
    <div className={`text-yellow-500 ${sizeClass}`} aria-label={`Rating ${r} out of 5`}>
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
