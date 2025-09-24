import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { removeFromCart, setQty, clearCart } from '../features/cart/cartSlice'
import { Trash2, Minus, Plus, ShoppingCart } from '../lib/icons'
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
        <h1 className="section-title">Cart</h1>
        <div className="card card-body max-w-md mx-auto empty-state space-y-2">
          <div className="icon-wrap"><ShoppingCart size={22} /></div>
          <h2 className="text-lg font-bold">Your cart is empty</h2>
          <p className="text-sm text-[--color-muted]">Browse products and add your favorites to the cart.</p>
          <Link to="/products" className="btn btn-primary w-max mx-auto">Start shopping</Link>
        </div>
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
              <div className="w-24 h-24 bg-[--color-bg-soft] rounded-lg overflow-hidden">
                <img src={it.image} alt={it.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium leading-snug line-clamp-2">{it.name}</div>
                <div className="text-sm text-[--color-muted]">Color: {it.color}</div>
                <div className="mt-2 flex items-center gap-3">
                  <div className="inline-flex items-center rounded-md border bg-white">
                    <button
                      className="px-2 py-1 hover:bg-[--color-bg-soft]"
                      onClick={() => dispatch(setQty({ slug: it.slug, quantity: Math.max(1, it.quantity - 1) }))}
                      aria-label="Decrease quantity"
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      className="w-14 text-center outline-none border-x"
                      value={it.quantity}
                      onChange={e => dispatch(setQty({ slug: it.slug, quantity: Math.max(1, Math.min(99, Number(e.target.value)||1)) }))}
                    />
                    <button
                      className="px-2 py-1 hover:bg-[--color-bg-soft]"
                      onClick={() => dispatch(setQty({ slug: it.slug, quantity: Math.min(99, it.quantity + 1) }))}
                      aria-label="Increase quantity"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => dispatch(removeFromCart({ slug: it.slug }))}>
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

        <aside className="card h-max md:sticky md:top-24">
          <div className="card-body">
          <h2 className="card-title mb-3">Summary</h2>
          <div className="flex justify-between text-sm"><span>Subtotal</span><span><Price price={totals.subtotal} /></span></div>
          <div className="flex justify-between text-sm"><span>Shipping</span><span>Free</span></div>
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
