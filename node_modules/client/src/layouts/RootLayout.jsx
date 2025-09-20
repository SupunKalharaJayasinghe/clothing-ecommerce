import { Link, NavLink, Outlet } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { APP_NAME } from '../lib/constants'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { logoutUser, fetchMe } from '../features/auth/authSlice'
import { Menu } from '../lib/icons'

export default function RootLayout() {
  const [open, setOpen] = useState(false)
  const { user, status, hydrated } = useAppSelector(s => s.auth)
  const dispatch = useAppDispatch()

  // hydrate session from cookie (guard against StrictMode double-effect)
  const didHydrate = useRef(false)
  useEffect(() => {
    if (didHydrate.current) return
    didHydrate.current = true
    dispatch(fetchMe())
  }, [dispatch])

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="sticky top-0 z-40">
        <div className="container-app py-3">
          <div className="h-14 px-4 rounded-2xl border bg-white/80 backdrop-blur shadow-soft flex items-center justify-between">
            <Link to="/" className="font-black text-lg tracking-tight">
              {APP_NAME}
            </Link>
            <button
              className="md:hidden rounded-xl border px-3 py-2 bg-white/70"
              onClick={() => setOpen(o => !o)}
              aria-label="Toggle menu"
            >
              <Menu size={18} />
            </button>
            {!hydrated ? (
              <div className="hidden md:flex items-center gap-2 w-[36rem] h-9 rounded-full bg-[--color-bg-soft] animate-pulse" />
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
                >Cart</NavLink>
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
          {open && (
            <nav className="md:hidden mt-2 rounded-2xl border bg-white/90 backdrop-blur shadow-lg">
              <div className="px-4 py-3 flex flex-col gap-1">
                {!hydrated ? (
                  <div className="h-8 rounded-xl bg-[--color-bg-soft] animate-pulse" />
                ) : (
                  <>
                    <NavLink to="/" end className={({isActive}) => `px-4 py-2 rounded-xl ${isActive ? 'bg-[--color-brand-50] text-[--color-brand-700] font-semibold' : 'text-[--color-muted] hover:bg-[--color-bg-soft]'}`} onClick={() => setOpen(false)}>Home</NavLink>
                    <NavLink to="/products" className={({isActive}) => `px-4 py-2 rounded-xl ${isActive ? 'bg-[--color-brand-50] text-[--color-brand-700] font-semibold' : 'text-[--color-muted] hover:bg-[--color-bg-soft]'}`} onClick={() => setOpen(false)}>Shop</NavLink>
                    {user && <NavLink to="/favorites" className={({isActive}) => `px-4 py-2 rounded-xl ${isActive ? 'bg-[--color-brand-50] text-[--color-brand-700] font-semibold' : 'text-[--color-muted] hover:bg-[--color-bg-soft]'}`} onClick={() => setOpen(false)}>Favorites</NavLink>}
                    <NavLink to="/cart" className={({isActive}) => `px-4 py-2 rounded-xl ${isActive ? 'bg-[--color-brand-50] text-[--color-brand-700] font-semibold' : 'text-[--color-muted] hover:bg-[--color-bg-soft]'}`} onClick={() => setOpen(false)}>Cart</NavLink>
                    {!user ? (
                      <>
                        <NavLink to="/login" className={({isActive}) => `px-4 py-2 rounded-xl ${isActive ? 'bg-[--color-brand-50] text-[--color-brand-700] font-semibold' : 'text-[--color-muted] hover:bg-[--color-bg-soft]'}`} onClick={() => setOpen(false)}>Login</NavLink>
                        <NavLink to="/register" className={({isActive}) => `px-4 py-2 rounded-xl ${isActive ? 'bg-[--color-brand-50] text-[--color-brand-700] font-semibold' : 'text-[--color-muted] hover:bg-[--color-bg-soft]'}`} onClick={() => setOpen(false)}>Register</NavLink>
                      </>
                    ) : (
                      <>
                        <NavLink to="/orders" className={({isActive}) => `px-4 py-2 rounded-xl ${isActive ? 'bg-[--color-brand-50] text-[--color-brand-700] font-semibold' : 'text-[--color-muted] hover:bg-[--color-bg-soft]'}`} onClick={() => setOpen(false)}>Orders</NavLink>
                        <NavLink to="/account" className={({isActive}) => `px-4 py-2 rounded-xl ${isActive ? 'bg-[--color-brand-50] text-[--color-brand-700] font-semibold' : 'text-[--color-muted] hover:bg-[--color-bg-soft]'}`} onClick={() => setOpen(false)}>Account</NavLink>
                        <button
                          className="btn btn-primary btn-sm rounded-lg w-max"
                          onClick={() => { setOpen(false); dispatch(logoutUser()) }}
                        >
                          Logout
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </nav>
          )}
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
