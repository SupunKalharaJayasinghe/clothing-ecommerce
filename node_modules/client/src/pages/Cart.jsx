import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { removeFromCart, setQty, clearCart } from '../features/cart/cartSlice'
import { Trash2 } from '../lib/icons'
import Price from '../components/ui/Price'

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
      <div className="container-app section max-w-4xl text-center">
        <h1 className="text-2xl font-bold mb-2">Your cart is empty</h1>
        <Link to="/products" className="underline">Browse products</Link>
      </div>
    )
  }

  return (
    <div className="container-app section max-w-5xl">
      <h1 className="section-title">Cart</h1>

      <div className="grid md:grid-cols-3 gap-6 mt-6">
        <div className="md:col-span-2 space-y-3">
          {items.map(it => (
            <div key={it.slug} className="card p-3 flex gap-3 items-start">
              <div className="w-24 h-24 bg-[--color-bg-soft] rounded overflow-hidden">
                <img src={it.image} alt={it.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <div className="font-medium leading-snug">{it.name}</div>
                <div className="text-sm text-[--color-muted]">Color: {it.color}</div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={99}
                    className="input w-24"
                    value={it.quantity}
                    onChange={e => dispatch(setQty({ slug: it.slug, quantity: Number(e.target.value) }))}
                  />
                  <button className="btn btn-outline btn-sm" onClick={() => dispatch(removeFromCart({ slug: it.slug }))}>
                    <Trash2 size={14} /> Remove
                  </button>
                </div>
              </div>
              <div className="text-right">
                <div className="price"><Price price={it.price * it.quantity} /></div>
                <div className="text-sm text-[--color-muted]"><Price price={it.price} /> each</div>
              </div>
            </div>
          ))}
          <button className="btn btn-ghost btn-sm w-max" onClick={() => dispatch(clearCart())}>Clear cart</button>
        </div>

        <aside className="card h-max">
          <div className="card-body">
          <h2 className="card-title mb-3">Summary</h2>
          <div className="flex justify-between"><span>Subtotal</span><span><Price price={totals.subtotal} /></span></div>
          <div className="flex justify-between"><span>Shipping</span><span>Free</span></div>
          <div className="flex justify-between font-semibold mt-2"><span>Total</span><span><Price price={totals.grand} /></span></div>
          <button
            className="mt-4 w-full btn btn-primary"
            onClick={() => navigate('/checkout')}
          >
            Proceed to checkout
          </button>
          </div>
        </aside>
      </div>
    </div>
  )
}
