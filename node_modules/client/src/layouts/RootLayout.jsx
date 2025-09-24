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
          <div className="h-16 px-6 rounded-2xl border-2 border-[--color-brand-400]/50 bg-white/95 backdrop-blur-xl shadow-glow flex items-center justify-between gap-4 animate-slide-up">
            <Link to="/" className="flex items-center hover:scale-110 transition-all duration-300">
              <img 
                src="/public/image/site logo.png" 
                alt="Site Logo" 
                className="h-8 w-auto object-contain bg-transparent"
                onError={(e) => {
                  // Fallback to text if logo fails to load
                  e.target.style.display = 'none';
                  e.target.nextElementSibling.style.display = 'block';
                }}
              />
              <span 
                className="bg-gradient-to-r from-[--color-brand-500] via-[--color-cyan-500] to-[--color-pink-500] bg-clip-text text-transparent font-extrabold text-xl tracking-tight whitespace-nowrap" 
                style={{display: 'none'}}
              >
                {APP_NAME}
              </span>
            </Link>
            <button
              className="md:hidden rounded-xl border-2 border-[--color-brand-400] px-4 py-3 bg-white/90 hover:bg-gradient-to-r hover:from-[--color-brand-500] hover:to-[--color-brand-600] hover:shadow-glow transition-all duration-300 icon-bounce group"
              onClick={() => setOpen(o => !o)}
              aria-label="Toggle menu"
              aria-expanded={open}
              aria-controls="mobile-drawer"
            >
              <Menu size={20} className="transition-all duration-300 text-[--color-text-high] group-hover:text-white group-hover:rotate-90" />
            </button>
            {!hydrated ? (
              <div className="hidden md:flex items-center gap-2" />
            ) : (
              <nav className="hidden md:flex items-center gap-4">
                <NavLink
                  to="/"
                  end
                  className={({isActive}) => `px-4 py-2 rounded-xl transition-all duration-300 hover:scale-105 font-medium text-xs uppercase tracking-wide border ${isActive ? 'bg-gradient-to-r from-[--color-brand-500] to-[--color-brand-600] text-black shadow-glow border-[--color-brand-400] transform scale-105' : 'text-[--color-text-high] bg-white/20 border-gray-300 hover:bg-gradient-to-r hover:from-[--color-brand-500] hover:to-[--color-brand-600] hover:text-black hover:shadow-glow hover:border-[--color-brand-400]'}`}
                >Home</NavLink>
                <NavLink
                  to="/products"
                  className={({isActive}) => `px-4 py-2 rounded-xl transition-all duration-300 hover:scale-105 font-medium text-xs uppercase tracking-wide border ${isActive ? 'bg-gradient-to-r from-[--color-brand-500] to-[--color-brand-600] text-black shadow-glow border-[--color-brand-400] transform scale-105' : 'text-[--color-text-high] bg-white/20 border-gray-300 hover:bg-gradient-to-r hover:from-[--color-brand-500] hover:to-[--color-brand-600] hover:text-black hover:shadow-glow hover:border-[--color-brand-400]'}`}
                >Shop</NavLink>
                {user && (
                  <NavLink
                    to="/favorites"
                    className={({isActive}) => `px-4 py-2 rounded-xl transition-all duration-300 hover:scale-105 font-medium text-xs uppercase tracking-wide border ${isActive ? 'bg-gradient-to-r from-[--color-pink-500] to-[--color-pink-600] text-black shadow-pink border-[--color-pink-400] transform scale-105' : 'text-[--color-text-high] bg-white/20 border-gray-300 hover:bg-gradient-to-r hover:from-[--color-pink-500] hover:to-[--color-pink-600] hover:text-black hover:shadow-pink hover:border-[--color-pink-400]'}`}
                  >Favorites</NavLink>
                )}
                <NavLink
                  to="/cart"
                  className={({isActive}) => `px-4 py-2 rounded-xl transition-all duration-300 hover:scale-105 font-medium text-xs uppercase tracking-wide relative border ${isActive ? 'bg-gradient-to-r from-[--color-cyan-500] to-[--color-cyan-600] text-black shadow-cyan border-[--color-cyan-400] transform scale-105' : 'text-[--color-text-high] bg-white/20 border-gray-300 hover:bg-gradient-to-r hover:from-[--color-cyan-500] hover:to-[--color-cyan-600] hover:text-black hover:shadow-cyan hover:border-[--color-cyan-400]'}`}
                >
                  Cart{cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 inline-flex items-center justify-center text-[10px] px-2 py-1 rounded-full bg-gradient-to-r from-[--color-pink-500] to-[--color-pink-600] text-white font-bold animate-bounce-in shadow-pink border border-[--color-pink-300]">
                      {cartCount}
                    </span>
                  )}
                </NavLink>
                {!user ? (
                  <>
                    <NavLink to="/login" className={({isActive}) => `px-4 py-2 rounded-xl transition-all duration-300 hover:scale-105 font-medium text-xs uppercase tracking-wide border ${isActive ? 'bg-gradient-to-r from-[--color-brand-500] to-[--color-brand-600] text-black shadow-glow border-[--color-brand-400] transform scale-105' : 'text-[--color-text-high] bg-white/20 border-gray-300 hover:bg-gradient-to-r hover:from-[--color-brand-500] hover:to-[--color-brand-600] hover:text-black hover:shadow-glow hover:border-[--color-brand-400]'}`}>Login</NavLink>
                    <NavLink to="/register" className={({isActive}) => `px-4 py-2 rounded-xl transition-all duration-300 hover:scale-105 font-medium text-xs uppercase tracking-wide border ${isActive ? 'bg-gradient-to-r from-[--color-pink-500] to-[--color-pink-600] text-black shadow-pink border-[--color-pink-400] transform scale-105' : 'text-[--color-text-high] bg-white/20 border-gray-300 hover:bg-gradient-to-r hover:from-[--color-pink-500] hover:to-[--color-pink-600] hover:text-black hover:shadow-pink hover:border-[--color-pink-400]'}`}>Register</NavLink>
                  </>
                ) : (
                  <div className="flex items-center gap-4">
                    <NavLink to="/orders" className={({isActive}) => `px-4 py-2 rounded-xl transition-all duration-300 hover:scale-105 font-medium text-xs uppercase tracking-wide border ${isActive ? 'bg-gradient-to-r from-[--color-cyan-500] to-[--color-cyan-600] text-black shadow-cyan border-[--color-cyan-400] transform scale-105' : 'text-[--color-text-high] bg-white/20 border-gray-300 hover:bg-gradient-to-r hover:from-[--color-cyan-500] hover:to-[--color-cyan-600] hover:text-black hover:shadow-cyan hover:border-[--color-cyan-400]'}`}>Orders</NavLink>
                    <NavLink to="/account" className={({isActive}) => `px-4 py-2 rounded-xl transition-all duration-300 hover:scale-105 font-medium text-xs uppercase tracking-wide border ${isActive ? 'bg-gradient-to-r from-[--color-brand-500] to-[--color-brand-600] text-black shadow-glow border-[--color-brand-400] transform scale-105' : 'text-[--color-text-high] bg-white/20 border-gray-300 hover:bg-gradient-to-r hover:from-[--color-brand-500] hover:to-[--color-brand-600] hover:text-black hover:shadow-glow hover:border-[--color-brand-400]'}`}>Account</NavLink>
                    <button className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white hover:text-white font-medium text-xs uppercase tracking-wide transition-all duration-300 hover:scale-105 border border-blue-400 hover:shadow-blue-500/50" onClick={() => dispatch(logoutUser())}>
                      Logout
                    </button>
                  </div>
                )}
              </nav>
            )}
          </div>
          {/* Mobile side drawer navigation (always mounted for smooth transitions) */}
          <div
            className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-md md:hidden transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <aside
            id="mobile-drawer"
            className={`fixed inset-y-0 left-0 z-50 w-[85%] max-w-xs bg-white/95 backdrop-blur-xl shadow-glow border-r-2 border-[--color-brand-400]/50 md:hidden transform transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${open ? 'translate-x-0' : '-translate-x-full'} pl-[env(safe-area-inset-left)] pb-[env(safe-area-inset-bottom)] rounded-r-3xl will-change-transform`}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
          >
            <div className="h-full flex flex-col animate-drawer-pop">
              <div className="px-6 py-4 border-b-2 border-[--color-brand-400]/30 flex items-center justify-between bg-gradient-to-r from-[--color-brand-50] to-[--color-cyan-50]">
                <Link to="/" className="flex items-center" onClick={() => setOpen(false)}>
                  <img 
                    src="/public/image/site logo.png" 
                    alt="Site Logo" 
                    className="h-10 w-auto object-contain bg-transparent"
                    onError={(e) => {
                      // Fallback to text if logo fails to load
                      e.target.style.display = 'none';
                      e.target.nextElementSibling.style.display = 'block';
                    }}
                  />
                  <span 
                    className="bg-gradient-to-r from-[--color-brand-500] via-[--color-cyan-500] to-[--color-pink-500] bg-clip-text text-transparent font-extrabold text-xl tracking-tight" 
                    style={{display: 'none'}}
                  >
                    {APP_NAME}
                  </span>
                </Link>
                <button className="rounded-xl p-3 bg-white/80 hover:bg-gradient-to-r hover:from-[--color-pink-500] hover:to-[--color-pink-600] transition-all duration-300 icon-spin hover:shadow-pink group border-2 border-transparent hover:border-[--color-pink-400]" onClick={() => setOpen(false)} aria-label="Close menu">
                  <X className="text-[--color-text-high] group-hover:text-white transition-colors duration-300" />
                </button>
              </div>
              <nav className="px-4 py-6 flex flex-col gap-2">
                {!hydrated ? (
                  <div className="h-12 rounded-xl bg-white/80 animate-pulse border-2 border-[--color-brand-200]" />
                ) : (
                  <>
                    <NavLink ref={firstLinkRef} to="/" end className={({isActive}) => `px-6 py-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-[--color-brand-400] font-black text-sm uppercase tracking-wide transition-all duration-300 ${isActive ? 'bg-gradient-to-r from-[--color-brand-500] to-[--color-brand-600] text-white shadow-glow border-2 border-[--color-brand-400]' : 'text-[--color-text-high] bg-white/80 hover:bg-gradient-to-r hover:from-[--color-brand-500] hover:to-[--color-brand-600] hover:text-white hover:shadow-glow border-2 border-transparent hover:border-[--color-brand-400]'}`} onClick={() => setOpen(false)}>Home</NavLink>
                    <NavLink to="/products" className={({isActive}) => `px-6 py-4 rounded-xl font-black text-sm uppercase tracking-wide transition-all duration-300 ${isActive ? 'bg-gradient-to-r from-[--color-brand-500] to-[--color-brand-600] text-white shadow-glow border-2 border-[--color-brand-400]' : 'text-[--color-text-high] bg-white/80 hover:bg-gradient-to-r hover:from-[--color-brand-500] hover:to-[--color-brand-600] hover:text-white hover:shadow-glow border-2 border-transparent hover:border-[--color-brand-400]'}`} onClick={() => setOpen(false)}>Shop</NavLink>
                    {user && <NavLink to="/favorites" className={({isActive}) => `px-6 py-4 rounded-xl font-black text-sm uppercase tracking-wide transition-all duration-300 ${isActive ? 'bg-gradient-to-r from-[--color-pink-500] to-[--color-pink-600] text-white shadow-pink border-2 border-[--color-pink-400]' : 'text-[--color-text-high] bg-white/80 hover:bg-gradient-to-r hover:from-[--color-pink-500] hover:to-[--color-pink-600] hover:text-white hover:shadow-pink border-2 border-transparent hover:border-[--color-pink-400]'}`} onClick={() => setOpen(false)}>Favorites</NavLink>}
                    <NavLink to="/cart" className={({isActive}) => `px-6 py-4 rounded-xl font-black text-sm uppercase tracking-wide transition-all duration-300 relative ${isActive ? 'bg-gradient-to-r from-[--color-cyan-500] to-[--color-cyan-600] text-white shadow-cyan border-2 border-[--color-cyan-400]' : 'text-[--color-text-high] bg-white/80 hover:bg-gradient-to-r hover:from-[--color-cyan-500] hover:to-[--color-cyan-600] hover:text-white hover:shadow-cyan border-2 border-transparent hover:border-[--color-cyan-400]'}`} onClick={() => setOpen(false)}>
                      Cart{cartCount > 0 && (
                        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center text-[10px] px-2 py-1 rounded-full bg-gradient-to-r from-[--color-pink-500] to-[--color-pink-600] text-white font-bold shadow-pink border border-[--color-pink-300]">
                          {cartCount}
                        </span>
                      )}
                    </NavLink>
                    {!user ? (
                      <>
                        <NavLink to="/login" className={({isActive}) => `px-6 py-4 rounded-xl font-black text-sm uppercase tracking-wide transition-all duration-300 ${isActive ? 'bg-gradient-to-r from-[--color-brand-500] to-[--color-brand-600] text-white shadow-glow border-2 border-[--color-brand-400]' : 'text-[--color-text-high] bg-white/80 hover:bg-gradient-to-r hover:from-[--color-brand-500] hover:to-[--color-brand-600] hover:text-white hover:shadow-glow border-2 border-transparent hover:border-[--color-brand-400]'}`} onClick={() => setOpen(false)}>Login</NavLink>
                        <NavLink to="/register" className={({isActive}) => `px-6 py-4 rounded-xl font-black text-sm uppercase tracking-wide transition-all duration-300 ${isActive ? 'bg-gradient-to-r from-[--color-pink-500] to-[--color-pink-600] text-white shadow-pink border-2 border-[--color-pink-400]' : 'text-[--color-text-high] bg-white/80 hover:bg-gradient-to-r hover:from-[--color-pink-500] hover:to-[--color-pink-600] hover:text-white hover:shadow-pink border-2 border-transparent hover:border-[--color-pink-400]'}`} onClick={() => setOpen(false)}>Register</NavLink>
                      </>
                    ) : (
                      <>
                        <NavLink to="/orders" className={({isActive}) => `px-6 py-4 rounded-xl font-black text-sm uppercase tracking-wide transition-all duration-300 ${isActive ? 'bg-gradient-to-r from-[--color-cyan-500] to-[--color-cyan-600] text-white shadow-cyan border-2 border-[--color-cyan-400]' : 'text-[--color-text-high] bg-white/80 hover:bg-gradient-to-r hover:from-[--color-cyan-500] hover:to-[--color-cyan-600] hover:text-white hover:shadow-cyan border-2 border-transparent hover:border-[--color-cyan-400]'}`} onClick={() => setOpen(false)}>Orders</NavLink>
                        <NavLink to="/account" className={({isActive}) => `px-6 py-4 rounded-xl font-black text-sm uppercase tracking-wide transition-all duration-300 ${isActive ? 'bg-gradient-to-r from-[--color-brand-500] to-[--color-brand-600] text-white shadow-glow border-2 border-[--color-brand-400]' : 'text-[--color-text-high] bg-white/80 hover:bg-gradient-to-r hover:from-[--color-brand-500] hover:to-[--color-brand-600] hover:text-white hover:shadow-glow border-2 border-transparent hover:border-[--color-brand-400]'}`} onClick={() => setOpen(false)}>Account</NavLink>
                        <button
                          className="btn btn-primary btn-sm rounded-xl w-max ml-2 mt-4 font-black uppercase tracking-wide bg-gradient-to-r from-[--color-orange-500] to-[--color-orange-600] text-white hover:shadow-glow border-2 border-[--color-orange-400]"
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

      <footer className="border-t py-8 text-sm">
        <div className="container-app flex flex-col md:flex-row items-center justify-between gap-3">
          <div>© {new Date().getFullYear()} {APP_NAME}. All rights reserved.</div>
          <nav className="flex items-center gap-4">
            <Link className="hover:underline" to="/about">About</Link>
            <Link className="hover:underline" to="/privacy">Privacy</Link>
            <Link className="hover:underline" to="/terms">Terms</Link>
            <Link className="hover:underline" to="/contact">Contact</Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
