import React, { useState } from 'react'
import { Menu } from 'lucide-react'
import { useAuth } from '../state/auth'
import ConfirmLogout from './ConfirmLogout'

export default function Topbar({ onMenu }) {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  return (
    <>
      <header className="mobile-topbar">
        <div className="flex items-center gap-3">
          <button className="mobile-menu-btn md:hidden" onClick={onMenu} aria-label="Open menu">
            <Menu size={20} />
          </button>
          <div className="font-semibold text-[color:var(--text-primary)]">Admin Dashboard</div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden sm:block text-[color:var(--text-muted)]">{user?.email}</span>
          <button onClick={() => setOpen(true)} className="btn btn-secondary btn-sm">Logout</button>
        </div>
      </header>
      <ConfirmLogout open={open} onClose={() => setOpen(false)} onConfirm={async () => { await logout(); setOpen(false) }} />
    </>
  )
}
