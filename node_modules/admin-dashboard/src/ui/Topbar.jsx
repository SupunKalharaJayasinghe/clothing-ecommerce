import React, { useState } from 'react'
import { Menu } from 'lucide-react'
import { useAuth } from '../state/auth'
import ConfirmLogout from './ConfirmLogout'

export default function Topbar({ onMenu }) {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between backdrop-blur bg-white/70 dark:bg-[#0b0f1a]/70 border-b px-3 md:px-4 py-2 rounded-md">
        <div className="flex items-center gap-2">
          <button className="md:hidden inline-flex items-center justify-center p-2 rounded hover:bg-gray-100 dark:hover:bg-white/10" onClick={onMenu} aria-label="Open menu">
            <Menu size={20} />
          </button>
          <div className="font-semibold text-[color:var(--ink-strong)]">Admin Dashboard</div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden sm:block text-[color:var(--ink-muted)]">{user?.email}</span>
          <button onClick={() => setOpen(true)} className="btn btn-light">Logout</button>
        </div>
      </header>
      <ConfirmLogout open={open} onClose={() => setOpen(false)} onConfirm={async () => { await logout(); setOpen(false) }} />
    </>
  )
}
