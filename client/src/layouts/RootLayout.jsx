import { Link, NavLink, Outlet } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { APP_NAME } from '../lib/constants'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { logoutUser, fetchMe } from '../features/auth/authSlice'
import { Menu, X } from '../lib/icons'

export default function RootLayout() {
  const [open, setOpen] = useState(false)
  const { user, status, hydrated } = useAppSelector(s => s.auth)
  const { items: cartItems = [] } = useAppSelector(s => s.cart || { items: [] })
  const dispatch = useAppDispatch()

  // hydrate session from cookie (guard against StrictMode double-effect)
  const didHydrate = useRef(false)
  useEffect(() => {
    if (didHydrate.current) return
    didHydrate.current = true
    dispatch(fetchMe())
  }, [dispatch])

  // Lock scroll and add Escape-to-close when drawer is open
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    if (open) {
      document.documentElement.style.overflow = 'hidden'
      window.addEventListener('keydown', onKey)
    } else {
      document.documentElement.style.overflow = ''
    }
    return () => { window.removeEventListener('keydown', onKey); document.documentElement.style.overflow = '' }
  }, [open])

  // Focus first link when opening drawer (accessibility)
  const firstLinkRef = useRef(null)
  useEffect(() => {
    if (open && firstLinkRef.current) {
      try { firstLinkRef.current.focus() } catch {}
    }
  }, [open])

  const cartCount = (cartItems || []).reduce((sum, it) => sum + (Number(it.quantity) || 0), 0)


  return (
    <div className="min-h-dvh flex flex-col">
      <header className="sticky top-0 z-50">
        <div className="container-app py-2">
          <div className="h-16 px-4 rounded-xl border border-[--color-border] bg-[--color-surface] backdrop-filter backdrop-blur-lg shadow-lg flex items-center justify-between gap-4">
            <Link to="/" className="flex items-center hover:opacity-80 transition-opacity duration-150">
              <img 
                src="/image/site logo.png" 
                alt="Site Logo" 
                className="h-8 w-auto object-contain bg-transparent"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextElementSibling.style.display = 'block';
                }}
              />
              <span 
                className="font-extrabold text-xl tracking-tight text-[--color-text-high] whitespace-nowrap" 
                style={{display: 'none'}}
              >
                {APP_NAME}
              </span>
              </Link>
            <button
              className="md:hidden rounded-lg border border-[--color-border] px-3 py-2 bg-[--color-surface-glass] backdrop-filter backdrop-blur-sm hover:bg-[--color-surface-hover] transition-all duration-150 group"
              onClick={() => setOpen(o => !o)}
              aria-label="Toggle menu"
              aria-expanded={open}
            >
              <Menu size={20} className="text-[--color-text-high]" />
            </button>
            {!hydrated ? (
              <div className="hidden md:flex items-center gap-2" />
            ) : (
              <nav className="hidden md:flex items-center gap-4">
                <NavLink
                  to="/"
                  end
                  className={({isActive}) => `px-3 py-2 rounded-lg transition-all duration-150 text-sm font-medium ${isActive ? 'bg-gradient-to-r from-[--color-brand-600] to-[--color-brand-500] text-white shadow-glow' : 'text-[--color-text-high] hover:bg-[--color-surface-hover] hover:backdrop-blur-sm'}`}
                >Home</NavLink>
                <NavLink
                  to="/products"
                  className={({isActive}) => `px-3 py-2 rounded-lg transition-all duration-150 text-sm font-medium ${isActive ? 'bg-gradient-to-r from-[--color-brand-600] to-[--color-brand-500] text-white shadow-glow' : 'text-[--color-text-high] hover:bg-[--color-surface-hover] hover:backdrop-blur-sm'}`}
                >Shop</NavLink>
                {user && (
                  <NavLink
                    to="/favorites"
                    className={({isActive}) => `px-3 py-2 rounded-lg transition-all duration-150 text-sm font-medium ${isActive ? 'bg-gradient-to-r from-[--color-brand-600] to-[--color-brand-500] text-white shadow-glow' : 'text-[--color-text-high] hover:bg-[--color-surface-hover] hover:backdrop-blur-sm'}`}
                  >Favorites</NavLink>
                )}
                <NavLink
                  to="/cart"
                  className={({isActive}) => `px-3 py-2 rounded-lg transition-all duration-150 text-sm font-medium relative ${isActive ? 'bg-gradient-to-r from-[--color-brand-600] to-[--color-brand-500] text-white shadow-glow' : 'text-[--color-text-high] hover:bg-[--color-surface-hover] hover:backdrop-blur-sm'}`}
                >
                  Cart{cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 inline-flex items-center justify-center text-[10px] px-2 py-1 rounded-full bg-[--color-brand-600] text-white font-semibold border border-[--color-brand-600]">
                      {cartCount}
                    </span>
                  )}
                </NavLink>
                {!user ? (
                  <>
                    <NavLink to="/login" className={({isActive}) => `px-3 py-2 rounded-lg transition-all duration-150 text-sm font-medium ${isActive ? 'bg-gradient-to-r from-[--color-brand-600] to-[--color-brand-500] text-white shadow-glow' : 'text-[--color-text-high] hover:bg-[--color-surface-hover] hover:backdrop-blur-sm'}`}>Login</NavLink>
                    <NavLink to="/register" className={({isActive}) => `px-3 py-2 rounded-lg transition-all duration-150 text-sm font-medium ${isActive ? 'bg-gradient-to-r from-[--color-brand-600] to-[--color-brand-500] text-white shadow-glow' : 'text-[--color-text-high] hover:bg-[--color-surface-hover] hover:backdrop-blur-sm'}`}>Register</NavLink>
                  </>
                ) : (
                  <div className="flex items-center gap-4">
                    <NavLink to="/orders" className={({isActive}) => `px-3 py-2 rounded-lg transition-all duration-150 text-sm font-medium ${isActive ? 'bg-gradient-to-r from-[--color-brand-600] to-[--color-brand-500] text-white shadow-glow' : 'text-[--color-text-high] hover:bg-[--color-surface-hover] hover:backdrop-blur-sm'}`}>Orders</NavLink>
                    <NavLink to="/account" className={({isActive}) => `px-3 py-2 rounded-lg transition-all duration-150 text-sm font-medium ${isActive ? 'bg-gradient-to-r from-[--color-brand-600] to-[--color-brand-500] text-white shadow-glow' : 'text-[--color-text-high] hover:bg-[--color-surface-hover] hover:backdrop-blur-sm'}`}>Account</NavLink>
                    <button className="btn btn-outline btn-sm" onClick={() => dispatch(logoutUser())}>
                      Logout
                    </button>
                  </div>
                )}
              </nav>
            )}
          </div>
          {/* Mobile side drawer navigation (always mounted for smooth transitions) */}
          <div
            className={`fixed inset-0 z-40 bg-black/40 md:hidden transition-opacity duration-200 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <aside
            id="mobile-drawer"
            className={`fixed inset-y-0 left-0 z-50 w-[85%] max-w-xs bg-[--color-surface] backdrop-filter backdrop-blur-xl border-r border-[--color-border] shadow-xl md:hidden transform transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full'} pl-[env(safe-area-inset-left)] pb-[env(safe-area-inset-bottom)] rounded-r-xl`}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
          >
            <div className="h-full flex flex-col animate-drawer-pop">
              <div className="px-6 py-4 border-b border-[--color-border] flex items-center justify-between bg-[--color-surface-elevated]">
                <Link to="/" className="flex items-center" onClick={() => setOpen(false)}>
                  <img 
                    src="/image/site logo.png" 
                    alt="Site Logo" 
                    className="h-10 w-auto object-contain bg-transparent"
                    onError={(e) => {
                      // Fallback to text if logo fails to load
                      e.target.style.display = 'none';
                      e.target.nextElementSibling.style.display = 'block';
                    }}
                  />
                  <span 
                    className="font-extrabold text-xl tracking-tight text-[--color-text-high]" 
                    style={{display: 'none'}}
                  >
                    {APP_NAME}
                  </span>
                </Link>
                <button className="rounded-lg p-2 border border-[--color-border] hover:bg-[--color-surface-hover] transition-all duration-150" onClick={() => setOpen(false)} aria-label="Close menu">
                  <X className="text-[--color-text-high]" />
                </button>
              </div>
              <nav className="px-4 py-6 flex flex-col gap-2">
                {!hydrated ? (
                  <div className="h-12 rounded-xl bg-[--color-surface-glass] animate-pulse border border-[--color-border]" />
                ) : (
                  <>
                    <NavLink ref={firstLinkRef} to="/" end className={({isActive}) => `px-5 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[--color-brand-400] text-sm font-medium transition-all duration-150 ${isActive ? 'bg-gradient-to-r from-[--color-brand-600] to-[--color-brand-500] text-white shadow-glow' : 'text-[--color-text-high] hover:bg-[--color-surface-hover]'}`} onClick={() => setOpen(false)}>Home</NavLink>
                    <NavLink to="/products" className={({isActive}) => `px-5 py-3 rounded-lg text-sm font-medium transition-all duration-150 ${isActive ? 'bg-gradient-to-r from-[--color-brand-600] to-[--color-brand-500] text-white shadow-glow' : 'text-[--color-text-high] hover:bg-[--color-surface-hover]'}`} onClick={() => setOpen(false)}>Shop</NavLink>
                    {user && <NavLink to="/favorites" className={({isActive}) => `px-5 py-3 rounded-lg text-sm font-medium transition-all duration-150 ${isActive ? 'bg-gradient-to-r from-[--color-brand-600] to-[--color-brand-500] text-white shadow-glow' : 'text-[--color-text-high] hover:bg-[--color-surface-hover]'}`} onClick={() => setOpen(false)}>Favorites</NavLink>}
                    <NavLink to="/cart" className={({isActive}) => `px-5 py-3 rounded-lg text-sm font-medium transition-all duration-150 relative ${isActive ? 'bg-gradient-to-r from-[--color-brand-600] to-[--color-brand-500] text-white shadow-glow' : 'text-[--color-text-high] hover:bg-[--color-surface-hover]'}`} onClick={() => setOpen(false)}>
                      Cart{cartCount > 0 && (
                        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center text-[10px] px-2 py-1 rounded-full bg-[--color-brand-600] text-white font-semibold border border-[--color-brand-600]">
                          {cartCount}
                        </span>
                      )}
                    </NavLink>
                    {!user ? (
                      <>
                        <NavLink to="/login" className={({isActive}) => `px-5 py-3 rounded-lg text-sm font-medium transition-all duration-150 ${isActive ? 'bg-gradient-to-r from-[--color-brand-600] to-[--color-brand-500] text-white shadow-glow' : 'text-[--color-text-high] hover:bg-[--color-surface-hover]'}`} onClick={() => setOpen(false)}>Login</NavLink>
                        <NavLink to="/register" className={({isActive}) => `px-5 py-3 rounded-lg text-sm font-medium transition-all duration-150 ${isActive ? 'bg-gradient-to-r from-[--color-brand-600] to-[--color-brand-500] text-white shadow-glow' : 'text-[--color-text-high] hover:bg-[--color-surface-hover]'}`} onClick={() => setOpen(false)}>Register</NavLink>
                      </>
                    ) : (
                      <>
                        <NavLink to="/orders" className={({isActive}) => `px-5 py-3 rounded-lg text-sm font-medium transition-all duration-150 ${isActive ? 'bg-gradient-to-r from-[--color-brand-600] to-[--color-brand-500] text-white shadow-glow' : 'text-[--color-text-high] hover:bg-[--color-surface-hover]'}`} onClick={() => setOpen(false)}>Orders</NavLink>
                        <NavLink to="/account" className={({isActive}) => `px-5 py-3 rounded-lg text-sm font-medium transition-all duration-150 ${isActive ? 'bg-gradient-to-r from-[--color-brand-600] to-[--color-brand-500] text-white shadow-glow' : 'text-[--color-text-high] hover:bg-[--color-surface-hover]'}`} onClick={() => setOpen(false)}>Account</NavLink>
                        <button
                          className="btn btn-outline btn-sm w-max ml-2 mt-4"
                          onClick={() => { setOpen(false); dispatch(logoutUser()) }}
                        >
                          Logout
                        </button>
                      </>
                    )}
                  </>
                )}
              </nav>
            </div>
          </aside>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="mt-16 border-t border-[--color-border] bg-[--color-surface-glass] backdrop-blur-xl">
        <div className="container-app py-12">
          {/* Main Footer Content */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Brand Section */}
            <div className="md:col-span-1">
              <Link to="/" className="flex items-center mb-4 group">
                <img 
                  src="/image/site logo.png" 
                  alt="Site Logo" 
                  className="h-10 w-auto object-contain bg-transparent group-hover:scale-105 transition-transform duration-200"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextElementSibling.style.display = 'block';
                  }}
                />
                <span 
                  className="font-bold text-xl tracking-tight text-[--color-text-high] ml-3 group-hover:text-[--color-brand-400] transition-colors duration-200" 
                  style={{display: 'none'}}
                >
                  {APP_NAME}
                </span>
              </Link>
              <p className="text-sm text-[--color-text-medium] leading-relaxed mb-4">
                Fresh fits for every day. Discover the latest arrivals and essentials for Men, Women, and Kids.
              </p>
              <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-[--color-brand-500]/10 border border-[--color-brand-500]/20">
                <span className="text-xs font-medium text-[--color-brand-400]">Premium Quality</span>
              </div>
            </div>

            {/* Shop Section */}
            <div>
              <h3 className="font-bold text-[--color-text-high] mb-4 text-base">Shop</h3>
              <ul className="space-y-3">
                <li><Link to="/products" className="text-sm text-[--color-text-medium] hover:text-[--color-brand-400] hover:translate-x-1 transition-all duration-200 block">All Products</Link></li>
                <li><Link to="/products?category=men" className="text-sm text-[--color-text-medium] hover:text-[--color-brand-400] hover:translate-x-1 transition-all duration-200 block">Men's Fashion</Link></li>
                <li><Link to="/products?category=women" className="text-sm text-[--color-text-medium] hover:text-[--color-brand-400] hover:translate-x-1 transition-all duration-200 block">Women's Fashion</Link></li>
                <li><Link to="/products?category=kids" className="text-sm text-[--color-text-medium] hover:text-[--color-brand-400] hover:translate-x-1 transition-all duration-200 block">Kids' Fashion</Link></li>
              </ul>
            </div>

            {/* Account Section */}
            <div>
              <h3 className="font-bold text-[--color-text-high] mb-4 text-base">Account</h3>
              <ul className="space-y-3">
                {user ? (
                  <>
                    <li><Link to="/account" className="text-sm text-[--color-text-medium] hover:text-[--color-brand-400] hover:translate-x-1 transition-all duration-200 block">My Account</Link></li>
                    <li><Link to="/orders" className="text-sm text-[--color-text-medium] hover:text-[--color-brand-400] hover:translate-x-1 transition-all duration-200 block">Order History</Link></li>
                    <li><Link to="/favorites" className="text-sm text-[--color-text-medium] hover:text-[--color-brand-400] hover:translate-x-1 transition-all duration-200 block">Favorites</Link></li>
                  </>
                ) : (
                  <>
                    <li><Link to="/login" className="text-sm text-[--color-text-medium] hover:text-[--color-brand-400] hover:translate-x-1 transition-all duration-200 block">Sign In</Link></li>
                    <li><Link to="/register" className="text-sm text-[--color-text-medium] hover:text-[--color-brand-400] hover:translate-x-1 transition-all duration-200 block">Create Account</Link></li>
                  </>
                )}
                <li><Link to="/cart" className="text-sm text-[--color-text-medium] hover:text-[--color-brand-400] hover:translate-x-1 transition-all duration-200 block">Shopping Cart</Link></li>
              </ul>
            </div>

            {/* Support Section */}
            <div>
              <h3 className="font-bold text-[--color-text-high] mb-4 text-base">Support</h3>
              <ul className="space-y-3">
                <li><Link to="/contact" className="text-sm text-[--color-text-medium] hover:text-[--color-brand-400] hover:translate-x-1 transition-all duration-200 block">Contact Us</Link></li>
                <li><Link to="/about" className="text-sm text-[--color-text-medium] hover:text-[--color-brand-400] hover:translate-x-1 transition-all duration-200 block">About Us</Link></li>
                <li><Link to="/terms" className="text-sm text-[--color-text-medium] hover:text-[--color-brand-400] hover:translate-x-1 transition-all duration-200 block">Terms of Service</Link></li>
                <li><Link to="/privacy" className="text-sm text-[--color-text-medium] hover:text-[--color-brand-400] hover:translate-x-1 transition-all duration-200 block">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-[--color-border] pt-8">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
              <div className="text-sm text-[--color-text-medium]">
                © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
              </div>
              
              {/* Trust Indicators */}
              <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-[--color-text-medium]">Secure payments</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span className="text-[--color-text-medium]">Free shipping over Rs. 2,000</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  <span className="text-[--color-text-medium]">Easy returns</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
