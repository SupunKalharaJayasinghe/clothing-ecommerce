import { Star as LucideStar, StarHalf as LucideStarHalf } from 'lucide-react'

export default function Stars({ rating = 0, sizeClass = '' }) {
  const r = Math.round((Number(rating) || 0) * 2) / 2
  const fullCount = Math.floor(r)
  const hasHalf = r - fullCount >= 0.5 - 0.001
  const items = [0,1,2,3,4]
  return (
    <div className={`flex items-center ${sizeClass}`} aria-label={`Rating ${r} out of 5`}>
      {items.map((i) => {
        const idx = i + 1
        if (idx <= fullCount) {
          return <LucideStar key={i} size={16} className="text-yellow-500" />
        }
        if (hasHalf && idx === fullCount + 1) {
          return <LucideStarHalf key={i} size={16} className="text-yellow-500" />
        }
        return <LucideStar key={i} size={16} className="text-gray-300" />
      })}
    </div>
  )
}
