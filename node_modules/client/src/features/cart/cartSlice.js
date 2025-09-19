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
      const { slug, name, image, color, price, quantity = 1 } = payload
      const existing = state.items.find(i => i.slug === slug)
      if (existing) existing.quantity = Math.min(existing.quantity + quantity, 99)
      else state.items.push({ slug, name, image, color, price, quantity })
      save(state)
    },
    removeFromCart(state, { payload }) {
      state.items = state.items.filter(i => i.slug !== payload.slug)
      save(state)
    },
    setQty(state, { payload }) {
      const it = state.items.find(i => i.slug === payload.slug)
      if (it) {
        it.quantity = Math.max(1, Math.min(99, Number(payload.quantity) || 1))
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
