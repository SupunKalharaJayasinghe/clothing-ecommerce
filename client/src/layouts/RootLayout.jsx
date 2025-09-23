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
      <header className="sticky top-0 z-40">
        <div className="container-app py-3">
          <div className="h-14 px-4 rounded-2xl border bg-white/80 backdrop-blur shadow-soft flex items-center justify-between gap-3">
            <Link to="/" className="font-black text-lg tracking-tight whitespace-nowrap">
              {APP_NAME}
            </Link>
            <button
              className="md:hidden rounded-xl border px-3 py-2 bg-white/70"
              onClick={() => setOpen(o => !o)}
              aria-label="Toggle menu"
              aria-expanded={open}
              aria-controls="mobile-drawer"
            >
              <Menu size={18} />
            </button>
            {!hydrated ? (
              <div className="hidden md:flex items-center gap-2" />
            ) : (
              <nav className="hidden md:flex items-center gap-2">
                <NavLink
                  to="/"
                  end
                  className={({isActive}) => `px-4 py-2 rounded-full transition ${isActive ? 'bg-[--color-brand-50] text-[--color-brand-700] font-semibold' : 'text-[--color-muted] hover:bg-[--color-bg-soft]'}`}
                >Home</NavLink>
                <NavLink
                  to="/products"
                  className={({isActive}) => `px-4 py-2 rounded-full transition ${isActive ? 'bg-[--color-brand-50] text-[--color-brand-700] font-semibold' : 'text-[--color-muted] hover:bg-[--color-bg-soft]'}`}
                >Shop</NavLink>
                {user && (
                  <NavLink
                    to="/favorites"
                    className={({isActive}) => `px-4 py-2 rounded-full transition ${isActive ? 'bg-[--color-brand-50] text-[--color-brand-700] font-semibold' : 'text-[--color-muted] hover:bg-[--color-bg-soft]'}`}
                  >Favorites</NavLink>
                )}
                <NavLink
                  to="/cart"
                  className={({isActive}) => `px-4 py-2 rounded-full transition ${isActive ? 'bg-[--color-brand-50] text-[--color-brand-700] font-semibold' : 'text-[--color-muted] hover:bg-[--color-bg-soft]'}`}
                >
                  Cart{cartCount > 0 && (
                    <span className="ml-1 inline-flex items-center justify-center text-[10px] px-1.5 py-0.5 rounded-full bg-[--color-brand-600] text-white align-top">
                      {cartCount}
                    </span>
                  )}
                </NavLink>
                {!user ? (
                  <>
                    <NavLink to="/login" className={({isActive}) => `px-4 py-2 rounded-full transition ${isActive ? 'bg-[--color-brand-50] text-[--color-brand-700] font-semibold' : 'text-[--color-muted] hover:bg-[--color-bg-soft]'}`}>Login</NavLink>
                    <NavLink to="/register" className={({isActive}) => `px-4 py-2 rounded-full transition ${isActive ? 'bg-[--color-brand-50] text-[--color-brand-700] font-semibold' : 'text-[--color-muted] hover:bg-[--color-bg-soft]'}`}>Register</NavLink>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <NavLink to="/orders" className={({isActive}) => `px-4 py-2 rounded-full transition ${isActive ? 'bg-[--color-brand-50] text-[--color-brand-700] font-semibold' : 'text-[--color-muted] hover:bg-[--color-bg-soft]'}`}>Orders</NavLink>
                    <NavLink to="/account" className={({isActive}) => `px-4 py-2 rounded-full transition ${isActive ? 'bg-[--color-brand-50] text-[--color-brand-700] font-semibold' : 'text-[--color-muted] hover:bg-[--color-bg-soft]'}`}>Account</NavLink>
                    <button className="btn btn-primary btn-sm rounded-lg" onClick={() => dispatch(logoutUser())}>
                      Logout
                    </button>
                  </div>
                )}
              </nav>
            )}
          </div>
          {/* Mobile side drawer navigation (always mounted for smooth transitions) */}
          <div
            className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] md:hidden transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <aside
            id="mobile-drawer"
            className={`fixed inset-y-0 left-0 z-50 w-[85%] max-w-xs bg-white shadow-xl border-r md:hidden transform transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${open ? 'translate-x-0' : '-translate-x-full'} pl-[env(safe-area-inset-left)] pb-[env(safe-area-inset-bottom)] rounded-r-2xl will-change-transform`}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
          >
            <div className="h-full flex flex-col animate-drawer-pop">
              <div className="px-4 py-3 border-b flex items-center justify-between">
                <Link to="/" className="font-black text-lg tracking-tight" onClick={() => setOpen(false)}>{APP_NAME}</Link>
                <button className="rounded-xl p-2 hover:bg-[--color-bg-soft]" onClick={() => setOpen(false)} aria-label="Close menu">
                  <X />
                </button>
              </div>
              <nav className="px-2 py-3 flex flex-col gap-1">
                {!hydrated ? (
                  <div className="h-8 rounded-xl bg-[--color-bg-soft] animate-pulse" />
                ) : (
                  <>
                    <NavLink ref={firstLinkRef} to="/" end className={({isActive}) => `px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[--color-brand-200] ${isActive ? 'bg-[--color-brand-50] text-[--color-brand-700] font-semibold' : 'text-[--color-muted] hover:bg-[--color-bg-soft]'}`} onClick={() => setOpen(false)}>Home</NavLink>
                    <NavLink to="/products" className={({isActive}) => `px-4 py-3 rounded-xl ${isActive ? 'bg-[--color-brand-50] text-[--color-brand-700] font-semibold' : 'text-[--color-muted] hover:bg-[--color-bg-soft]'}`} onClick={() => setOpen(false)}>Shop</NavLink>
                    {user && <NavLink to="/favorites" className={({isActive}) => `px-4 py-3 rounded-xl ${isActive ? 'bg-[--color-brand-50] text-[--color-brand-700] font-semibold' : 'text-[--color-muted] hover:bg-[--color-bg-soft]'}`} onClick={() => setOpen(false)}>Favorites</NavLink>}
                    <NavLink to="/cart" className={({isActive}) => `px-4 py-3 rounded-xl ${isActive ? 'bg-[--color-brand-50] text-[--color-brand-700] font-semibold' : 'text-[--color-muted] hover:bg-[--color-bg-soft]'}`} onClick={() => setOpen(false)}>
                      Cart{cartCount > 0 && (
                        <span className="ml-1 inline-flex items-center justify-center text-[10px] px-1.5 py-0.5 rounded-full bg-[--color-brand-600] text-white align-top">
                          {cartCount}
                        </span>
                      )}
                    </NavLink>
                    {!user ? (
                      <>
                        <NavLink to="/login" className={({isActive}) => `px-4 py-3 rounded-xl ${isActive ? 'bg-[--color-brand-50] text-[--color-brand-700] font-semibold' : 'text-[--color-muted] hover:bg-[--color-bg-soft]'}`} onClick={() => setOpen(false)}>Login</NavLink>
                        <NavLink to="/register" className={({isActive}) => `px-4 py-3 rounded-xl ${isActive ? 'bg-[--color-brand-50] text-[--color-brand-700] font-semibold' : 'text-[--color-muted] hover:bg-[--color-bg-soft]'}`} onClick={() => setOpen(false)}>Register</NavLink>
                      </>
                    ) : (
                      <>
                        <NavLink to="/orders" className={({isActive}) => `px-4 py-3 rounded-xl ${isActive ? 'bg-[--color-brand-50] text-[--color-brand-700] font-semibold' : 'text-[--color-muted] hover:bg-[--color-bg-soft]'}`} onClick={() => setOpen(false)}>Orders</NavLink>
                        <NavLink to="/account" className={({isActive}) => `px-4 py-3 rounded-xl ${isActive ? 'bg-[--color-brand-50] text-[--color-brand-700] font-semibold' : 'text-[--color-muted] hover:bg-[--color-bg-soft]'}`} onClick={() => setOpen(false)}>Account</NavLink>
                        <button
                          className="btn btn-primary btn-sm rounded-lg w-max ml-4 mt-2"
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
