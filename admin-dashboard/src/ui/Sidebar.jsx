import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Users, Home, Package, ShoppingCart, CreditCard, RotateCcw, RefreshCw, Star, Truck } from 'lucide-react'
import { useAuth } from '../state/auth'
import ConfirmLogout from './ConfirmLogout'

function Item({ to, icon: Icon, label, roles, onClick }) {
  const { user } = useAuth()
  const userRoles = user?.roles || []
  const canSee = roles ? (Boolean(user?.isPrimaryAdmin) || userRoles.some(r => roles.includes(r))) : true
  if (!canSee) return null
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `nav-tile${isActive ? ' active' : ''}`}
      onClick={onClick}
    >
      <span className="tile-icon"><Icon size={20} /></span>
      <span className="tile-label">{label}</span>
    </NavLink>
  )
}

function getInitial(user) {
  const name = user?.name || user?.email || 'A'
  return name.trim().charAt(0).toUpperCase()
}

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth()
  const initial = getInitial(user)
  const isAdmin = (user?.roles || []).includes('admin')
  const [openLogout, setOpenLogout] = useState(false)
  
  const handleItemClick = () => {
    // Close sidebar on mobile when navigation item is clicked
    if (window.innerWidth < 768) {
      onClose?.()
    }
  }

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="profile-card">
        <div className="profile-header">
          <div className="avatar" aria-hidden="true">{initial}</div>
          <div className="profile-info">
            <div className="name">{user?.name || 'Admin User'}</div>
            <div className="email">{user?.email || 'admin@example.com'}</div>
          </div>
        </div>
        <div className="profile-stats">
          {isAdmin && <span className="badge-role">Admin</span>}
          <span className="status"><span className="dot" /> Online</span>
        </div>
      </div>

      <div className="nav-scroll">
        <nav className="nav-tiles">
          <Item to="/" icon={Home} label="Overview" onClick={handleItemClick} />
          <Item to="/admins" icon={Users} label="Admins" roles={["user_manager"]} onClick={handleItemClick} />
          <Item to="/customers" icon={Users} label="Customers" roles={["user_manager"]} onClick={handleItemClick} />
          <Item to="/products" icon={Package} label="Products" roles={["product_manager"]} onClick={handleItemClick} />
          <Item to="/orders" icon={ShoppingCart} label="Orders" roles={["order_manager"]} onClick={handleItemClick} />
          <Item to="/payments" icon={CreditCard} label="Payments" roles={["payment_manager"]} onClick={handleItemClick} />
          <Item to="/refunds" icon={RotateCcw} label="Refunds" roles={["refund_manager"]} onClick={handleItemClick} />
          <Item to="/returns" icon={RefreshCw} label="Returns" roles={["return_manager"]} onClick={handleItemClick} />
          <Item to="/reviews" icon={Star} label="Reviews" roles={["review_manager"]} onClick={handleItemClick} />
          <Item to="/delivery" icon={Truck} label="Delivery" roles={["order_manager"]} onClick={handleItemClick} />
        </nav>
      </div>

      <footer className="sidebar-bottom">
        <div className="copyright">© 2025 D&G</div>
        <button className="btn-logout" onClick={() => setOpenLogout(true)}>Logout</button>
      </footer>
      <ConfirmLogout open={openLogout} onClose={() => setOpenLogout(false)} onConfirm={async () => { await logout(); setOpenLogout(false) }} />
    </aside>
  )
}
