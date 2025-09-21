import React from 'react'
import { NavLink } from 'react-router-dom'
import { Users, Home, Package, ShoppingCart, CreditCard, RotateCcw, RefreshCw, Star } from 'lucide-react'
import { useAuth } from '../state/auth'

function Item({ to, icon: Icon, label, roles }) {
  const { user } = useAuth()
  const userRoles = user?.roles || []
  const canSee = roles ? (userRoles.includes('admin') || userRoles.some(r => roles.includes(r))) : true
  if (!canSee) return null
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-800 ${isActive ? 'bg-gray-800' : ''}`}
    >
      <Icon size={18} />
      <span>{label}</span>
    </NavLink>
  )
}

export default function Sidebar() {
  const { user, logout } = useAuth()
  return (
    <aside className="bg-gray-900 text-white p-4 min-h-screen">
      <div className="mb-6">
        <div className="font-semibold">Admin Dashboard</div>
        <div className="text-xs text-gray-400">{user?.email}</div>
      </div>
      <nav className="flex flex-col gap-1">
        <Item to="/" icon={Home} label="Overview" />
        <Item to="/admins" icon={Users} label="Admins" roles={["user_manager"]} />
        <Item to="/customers" icon={Users} label="Customers" roles={["user_manager"]} />
        <Item to="/products" icon={Package} label="Products" roles={["product_manager"]} />
        <Item to="/orders" icon={ShoppingCart} label="Orders" roles={["order_manager"]} />
        <Item to="/payments" icon={CreditCard} label="Payments" roles={["payment_manager"]} />
        <Item to="/refunds" icon={RotateCcw} label="Refunds" roles={["refund_manager"]} />
        <Item to="/returns" icon={RefreshCw} label="Returns" roles={["return_manager"]} />
        <Item to="/reviews" icon={Star} label="Reviews" roles={["review_manager"]} />
      </nav>
      <button onClick={logout} className="mt-6 text-sm text-gray-300 hover:text-white">Logout</button>
    </aside>
  )
}
