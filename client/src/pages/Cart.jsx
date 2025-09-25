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
        <div className="card card-body max-w-md mx-auto empty-state space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-[--color-brand-600] to-[--color-brand-500] flex items-center justify-center shadow-lg">
            <ShoppingCart size={24} className="text-white" />
          </div>
          <h2 className="text-xl font-bold text-[--color-text-high]">Your cart is empty</h2>
          <p className="text-[--color-text-medium]">Browse products and add your favorites to the cart.</p>
          <Link to="/products" className="btn btn-primary w-max mx-auto mt-4">Start shopping</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container-app section max-w-5xl">
      <h1 className="section-title">Cart</h1>

      <div className="grid lg:grid-cols-3 gap-8 mt-8">
        <div className="lg:col-span-2 space-y-4">
          {items.map(it => (
            <div key={it.slug} className="card p-6 flex gap-6 items-center">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-[--color-surface-glass] rounded-xl overflow-hidden backdrop-blur-sm border border-[--color-border]">
                <img src={it.image} alt={it.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <div className="font-semibold text-lg leading-snug line-clamp-2 text-[--color-text-high]">{it.name}</div>
                <div className="text-sm text-[--color-text-medium]">Color: <span className="font-medium">{it.color}</span></div>
                <div className="flex items-center gap-4 mt-3">
                  <div className="inline-flex items-center rounded-lg border border-[--color-border] bg-[--color-surface-glass] backdrop-blur-sm overflow-hidden">
                    <button
                      className="px-3 py-2 hover:bg-[--color-surface-hover] text-[--color-text-high] transition-all duration-150"
                      onClick={() => dispatch(setQty({ slug: it.slug, quantity: Math.max(1, it.quantity - 1) }))}
                      aria-label="Decrease quantity"
                    >
                      <Minus size={16} />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      className="w-16 text-center outline-none border-x border-[--color-border] bg-transparent text-[--color-text-high] py-2"
                      value={it.quantity}
                      onChange={e => dispatch(setQty({ slug: it.slug, quantity: Math.max(1, Math.min(99, Number(e.target.value)||1)) }))}
                    />
                    <button
                      className="px-3 py-2 hover:bg-[--color-surface-hover] text-[--color-text-high] transition-all duration-150"
                      onClick={() => dispatch(setQty({ slug: it.slug, quantity: Math.min(99, it.quantity + 1) }))}
                      aria-label="Increase quantity"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <button className="btn btn-ghost btn-sm text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => dispatch(removeFromCart({ slug: it.slug }))}>
                    <Trash2 size={16} /> Remove
                  </button>
                </div>
              </div>
              <div className="text-right space-y-1">
                <div className="text-xl font-bold text-[--color-text-high]"><Price price={it.price * it.quantity} /></div>
                <div className="text-sm text-[--color-text-medium]"><Price price={it.price} /> each</div>
              </div>
            </div>
          ))}
          <div className="flex justify-between items-center pt-4 border-t border-[--color-border]">
            <button className="btn btn-ghost btn-sm text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => dispatch(clearCart())}>
              <Trash2 size={16} /> Clear cart
            </button>
            <div className="text-sm text-[--color-text-medium]">
              {items.length} item{items.length !== 1 ? 's' : ''} in cart
            </div>
          </div>
        </div>

        <aside className="card h-max lg:sticky lg:top-0">
          <div className="card-body p-6 space-y-4">
            <h2 className="text-xl font-bold text-[--color-text-high] mb-4">Order Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-[--color-text-medium]">
                <span>Subtotal</span>
                <span className="font-semibold text-[--color-text-high]"><Price price={totals.subtotal} /></span>
              </div>
              <div className="flex justify-between text-[--color-text-medium]">
                <span>Shipping</span>
                <span className="font-semibold text-green-400">Free</span>
              </div>
              <div className="border-t border-[--color-border] pt-3">
                <div className="flex justify-between text-lg font-bold text-[--color-text-high]">
                  <span>Total</span>
                  <span><Price price={totals.grand} /></span>
                </div>
              </div>
            </div>
            <button
              className="mt-6 w-full btn btn-primary py-3 text-base font-semibold"
              onClick={() => navigate('/checkout')}
            >
              Proceed to checkout
            </button>
            <div className="text-xs text-[--color-text-medium] text-center mt-3">
              Secure checkout with SSL encryption
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
