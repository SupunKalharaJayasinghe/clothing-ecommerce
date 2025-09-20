import { Link, NavLink, Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { APP_NAME } from '../lib/constants'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { logoutUser, fetchMe } from '../features/auth/authSlice'
import { Menu } from '../lib/icons'

export default function RootLayout() {
  const [open, setOpen] = useState(false)
  const { user, status } = useAppSelector(s => s.auth)
  const dispatch = useAppDispatch()

  // hydrate session from cookie
  useEffect(() => {
    dispatch(fetchMe())
  }, [dispatch])

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="sticky top-0 z-40 border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 h-14 flex items-center justify-between">
          <Link to="/" className="font-bold text-lg">{APP_NAME}</Link>
          <button
            className="md:hidden rounded-lg border px-3 py-1"
            onClick={() => setOpen(o => !o)}
            aria-label="Toggle menu"
          >
            <Menu size={18} />
          </button>
          <nav className="hidden md:flex items-center gap-6">
            <NavLink to="/" end className={({isActive}) => `nav-link ${isActive ? 'nav-link-active' : ''}`}>Home</NavLink>
            <NavLink to="/products" className={({isActive}) => `nav-link ${isActive ? 'nav-link-active' : ''}`}>Shop</NavLink>
            {user && <NavLink to="/favorites" className={({isActive}) => `nav-link ${isActive ? 'nav-link-active' : ''}`}>Favorites</NavLink>}
            <NavLink to="/cart" className={({isActive}) => `nav-link ${isActive ? 'nav-link-active' : ''}`}>Cart</NavLink>
            {!user ? (
              <>
                <NavLink to="/login" className={({isActive}) => `nav-link ${isActive ? 'nav-link-active' : ''}`}>Login</NavLink>
                <NavLink to="/register" className={({isActive}) => `nav-link ${isActive ? 'nav-link-active' : ''}`}>Register</NavLink>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <NavLink to="/orders" className={({isActive}) => `nav-link ${isActive ? 'nav-link-active' : ''}`}>Orders</NavLink>
                <NavLink to="/account" className={({isActive}) => `nav-link ${isActive ? 'nav-link-active' : ''}`}>Account</NavLink>
                <button className="rounded-lg border px-3 py-1" onClick={() => dispatch(logoutUser())}>
                  Logout
                </button>
              </div>
            )}
          </nav>
        </div>
        {open && (
          <nav className="md:hidden border-t">
            <div className="px-4 py-3 flex flex-col gap-2">
              <NavLink to="/" end className={({isActive}) => `nav-link ${isActive ? 'nav-link-active' : ''}`} onClick={() => setOpen(false)}>Home</NavLink>
              <NavLink to="/products" className={({isActive}) => `nav-link ${isActive ? 'nav-link-active' : ''}`} onClick={() => setOpen(false)}>Shop</NavLink>
              {user && <NavLink to="/favorites" className={({isActive}) => `nav-link ${isActive ? 'nav-link-active' : ''}`} onClick={() => setOpen(false)}>Favorites</NavLink>}
              <NavLink to="/cart" className={({isActive}) => `nav-link ${isActive ? 'nav-link-active' : ''}`} onClick={() => setOpen(false)}>Cart</NavLink>
              {!user ? (
                <>
                  <NavLink to="/login" className={({isActive}) => `nav-link ${isActive ? 'nav-link-active' : ''}`} onClick={() => setOpen(false)}>Login</NavLink>
                  <NavLink to="/register" className={({isActive}) => `nav-link ${isActive ? 'nav-link-active' : ''}`} onClick={() => setOpen(false)}>Register</NavLink>
                </>
              ) : (
                <>
                  <NavLink to="/orders" className={({isActive}) => `nav-link ${isActive ? 'nav-link-active' : ''}`} onClick={() => setOpen(false)}>Orders</NavLink>
                  <NavLink to="/account" className={({isActive}) => `nav-link ${isActive ? 'nav-link-active' : ''}`} onClick={() => setOpen(false)}>Account</NavLink>
                  <button
                    className="rounded-lg border px-3 py-1 w-max"
                    onClick={() => { setOpen(false); dispatch(logoutUser()) }}
                  >
                    Logout
                  </button>
                </>
              )}
            </div>
          </nav>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t py-8 text-center text-sm">
        © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
      </footer>
    </div>
  )
}
