import { configureStore } from '@reduxjs/toolkit'

export const store = configureStore({
  reducer: {
    // auth: authReducer, cart: cartReducer, ... (later)
  },
  devTools: import.meta.env.MODE !== 'production',
})
