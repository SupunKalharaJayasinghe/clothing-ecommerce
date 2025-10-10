import { createSlice } from '@reduxjs/toolkit'

const LS_KEY = 'cart_v1'

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { items: [] }
    const parsed = JSON.parse(raw)
    return { items: Array.isArray(parsed.items) ? parsed.items : [] }
  } catch { return { items: [] } }
}
function save(state) {
  try { localStorage.setItem(LS_KEY, JSON.stringify({ items: state.items })) } catch (e) { void e }
}

const initialState = { items: load().items } // [{slug, name, image, color, price, stock?, quantity}]

const slice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart(state, { payload }) {
      const { slug, name, image, color, price, quantity = 1, stock } = payload
      const existing = state.items.find(i => i.slug === slug)
      const maxQty = Number.isFinite(stock) ? Math.max(0, Math.min(99, stock)) : 99
      if (existing) {
        // Update known stock if provided
        if (Number.isFinite(stock)) existing.stock = stock
        const cap = Number.isFinite(existing.stock) ? Math.max(0, Math.min(99, existing.stock)) : maxQty
        existing.quantity = Math.min(existing.quantity + quantity, cap)
      } else {
        const qty = Number.isFinite(stock) ? Math.min(quantity, Math.max(0, Math.min(99, stock))) : quantity
        state.items.push({ slug, name, image, color, price, quantity: Math.max(1, qty), ...(Number.isFinite(stock) ? { stock } : {}) })
      }
      save(state)
    },
    removeFromCart(state, { payload }) {
      state.items = state.items.filter(i => i.slug !== payload.slug)
      save(state)
    },
    setQty(state, { payload }) {
      const it = state.items.find(i => i.slug === payload.slug)
      if (it) {
        const desired = Number(payload.quantity) || 1
        const cap = Number.isFinite(it.stock) ? Math.max(1, Math.min(99, it.stock)) : 99
        it.quantity = Math.max(1, Math.min(cap, desired))
        save(state)
      }
    },
    clearCart(state) {
      state.items = []
      save(state)
    }
  }
})

export const { addToCart, removeFromCart, setQty, clearCart } = slice.actions
export default slice.reducer
