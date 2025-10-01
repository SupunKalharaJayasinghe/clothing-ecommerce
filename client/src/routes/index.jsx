import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
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
import About from '../pages/About'
import ForgotPassword from '../pages/ForgotPassword'     // <-- NEW
import ResetPassword from '../pages/ResetPassword'       // <-- NEW
import Loader from '../components/ui/Loader'
import Privacy from '../pages/Privacy'
import Terms from '../pages/Terms'
import Contact from '../pages/Contact'
import NotFound from '../pages/NotFound'
import Returns from '../pages/Returns'

function Protected({ children }) {
  const { user, status, hydrated } = useAppSelector(s => s.auth)
  const location = useLocation()
  // Wait until the initial session hydration completes to avoid premature redirects
  if (!hydrated || status === 'loading') return <Loader />
  if (user) return children
  const next = encodeURIComponent(location.pathname + location.search)
  return <Navigate to={`/login?next=${next}`} replace />
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
        <Route path="/returns" element={<Protected><Returns /></Protected>} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/about" element={<About />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />    {/* NEW */}
        <Route path="/reset-password/:token" element={<ResetPassword />} />{/* NEW */}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
