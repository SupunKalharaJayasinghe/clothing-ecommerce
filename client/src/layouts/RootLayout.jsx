import { Link, NavLink, Outlet } from 'react-router-dom'
import { useState } from 'react'
import { APP_NAME } from '../lib/constants'

export default function RootLayout() {
  const [open, setOpen] = useState(false)
  return (
    <div className="min-h-dvh flex flex-col">
      <header className="sticky top-0 z-40 border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 h-14 flex items-center justify-between">
          <Link to="/" className="font-bold text-lg">{APP_NAME}</Link>
          <button
            className="md:hidden rounded-lg border px-3 py-1"
            onClick={() => setOpen(o => !o)}
            aria-label="Toggle menu"
          >☰</button>
          <nav className="hidden md:flex gap-6">
            <NavLink to="/products" className="hover:underline">Shop</NavLink>
            <NavLink to="/favorites" className="hover:underline">Favorites</NavLink>
            <NavLink to="/cart" className="hover:underline">Cart</NavLink>
            <NavLink to="/login" className="hover:underline">Login</NavLink>
          </nav>
        </div>
        {open && (
          <nav className="md:hidden border-t">
            <div className="px-4 py-3 flex flex-col gap-2">
              <NavLink to="/products" onClick={() => setOpen(false)}>Shop</NavLink>
              <NavLink to="/favorites" onClick={() => setOpen(false)}>Favorites</NavLink>
              <NavLink to="/cart" onClick={() => setOpen(false)}>Cart</NavLink>
              <NavLink to="/login" onClick={() => setOpen(false)}>Login</NavLink>
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
