import { Routes, Route, Navigate } from 'react-router-dom'
import RootLayout from '../layouts/RootLayout'
import Home from '../pages/Home'
import ProductListing from '../pages/ProductListing'
import ProductDetails from '../pages/ProductDetails'
import Cart from '../pages/Cart'
import Checkout from '../pages/Checkout'
import Orders from '../pages/Orders'
import Favorites from '../pages/Favorites'
import Login from '../pages/Login'
import Register from '../pages/Register'
import { useAppSelector } from '../app/hooks'
import Account from '../pages/Account'
import ForgotPassword from '../pages/ForgotPassword'     // <-- NEW
import ResetPassword from '../pages/ResetPassword'       // <-- NEW

function Protected({ children }) {
  const { user, status } = useAppSelector(s => s.auth)
  if (status === 'loading') return <div className="p-6">Loading…</div>
  return user ? children : <Navigate to="/login" replace />
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<ProductListing />} />
        <Route path="/products/:slug" element={<ProductDetails />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Protected><Checkout /></Protected>} />
        <Route path="/orders" element={<Protected><Orders /></Protected>} />
        <Route path="/favorites" element={<Protected><Favorites /></Protected>} />
        <Route path="/account" element={<Protected><Account /></Protected>} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />    {/* NEW */}
        <Route path="/reset-password/:token" element={<ResetPassword />} />{/* NEW */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
