export default function Price({ price, discountPercent = 0, finalPrice }) {
  const hasDiscount = Number(discountPercent) > 0
  const current = Number(finalPrice ?? price) || 0
  const original = Number(price) || 0
  if (hasDiscount) {
    return (
      <div className="flex items-baseline gap-2">
        <span className="price">Rs. {current.toLocaleString()}</span>
        <span className="price-old">Rs. {original.toLocaleString()}</span>
      </div>
    )
  }
  return <div className="price">Rs. {current.toLocaleString()}</div>
}
