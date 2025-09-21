import React from 'react'
import { NavLink } from 'react-router-dom'
import { Users, Home, Package, ShoppingCart, CreditCard, RotateCcw, RefreshCw, Star } from 'lucide-react'
import { useAuth } from '../state/auth'

function Item({ to, icon: Icon, label, roles }) {
  const { user } = useAuth()
  const userRoles = user?.roles || []
  const canSee = roles ? (Boolean(user?.isPrimaryAdmin) || userRoles.some(r => roles.includes(r))) : true
  if (!canSee) return null
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `nav-tile${isActive ? ' active' : ''}`}
    >
      <span className="tile-icon"><Icon size={18} /></span>
      <span className="tile-label">{label}</span>
    </NavLink>
  )
}

function getInitial(user) {
  const name = user?.name || user?.email || 'A'
  return name.trim().charAt(0).toUpperCase()
}

export default function Sidebar() {
  const { user, logout } = useAuth()
  const initial = getInitial(user)
  const isAdmin = (user?.roles || []).includes('admin')
  return (
    <aside className="sidebar">
      <div className="profile-card">
        <div className="avatar" aria-hidden="true">{initial}</div>
        <div className="profile-text">
          <div className="name">{user?.name || 'Admin Dashboard'}</div>
          <div className="row">
            {isAdmin && <span className="badge-role">Admin</span>}
            <span className="status"><span className="dot" /> Online</span>
          </div>
        </div>
      </div>

      <div className="nav-scroll">
        <nav className="nav-tiles">
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
      </div>

      <footer className="sidebar-bottom">
        <div className="copyright">© 2025 D&G</div>
        <button className="btn-logout" onClick={logout}>Logout</button>
      </footer>
    </aside>
  )
}
