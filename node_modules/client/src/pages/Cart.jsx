import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { removeFromCart, setQty, clearCart } from '../features/cart/cartSlice'

function Price({ v }) {
  return <span>Rs. {Number(v || 0).toLocaleString()}</span>
}

export default function Cart() {
  const { items } = useAppSelector(s => s.cart)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const totals = useMemo(() => {
    const subtotal = items.reduce((s, it) => s + it.price * it.quantity, 0)
    return { subtotal, shipping: 0, discount: 0, grand: subtotal }
  }, [items])

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 text-center">
        <h1 className="text-2xl font-bold mb-2">Your cart is empty</h1>
        <Link to="/products" className="underline">Browse products</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Cart</h1>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-3">
          {items.map(it => (
            <div key={it.slug} className="border rounded-xl p-3 flex gap-3">
              <div className="w-24 h-24 bg-gray-50 rounded overflow-hidden">
                <img src={it.image} alt={it.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <div className="font-medium">{it.name}</div>
                <div className="text-sm opacity-70">Color: {it.color}</div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={99}
                    className="w-20 border rounded-lg px-2 py-1"
                    value={it.quantity}
                    onChange={e => dispatch(setQty({ slug: it.slug, quantity: Number(e.target.value) }))}
                  />
                  <button className="text-sm underline" onClick={() => dispatch(removeFromCart({ slug: it.slug }))}>
                    Remove
                  </button>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold"><Price v={it.price * it.quantity} /></div>
                <div className="text-sm opacity-70"><Price v={it.price} /> each</div>
              </div>
            </div>
          ))}
          <button className="text-sm underline" onClick={() => dispatch(clearCart())}>Clear cart</button>
        </div>

        <aside className="border rounded-xl p-4 h-max">
          <h2 className="font-semibold mb-3">Summary</h2>
          <div className="flex justify-between"><span>Subtotal</span><span><Price v={totals.subtotal} /></span></div>
          <div className="flex justify-between"><span>Shipping</span><span>Free</span></div>
          <div className="flex justify-between font-semibold mt-2"><span>Total</span><span><Price v={totals.grand} /></span></div>
          <button
            className="mt-4 w-full rounded-lg border px-4 py-2"
            onClick={() => navigate('/checkout')}
          >
            Proceed to checkout
          </button>
        </aside>
      </div>
    </div>
  )
}
