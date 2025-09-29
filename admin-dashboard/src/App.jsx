import React, { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import Sidebar from './ui/Sidebar'
import LoginPage from './pages/Login'
import DashboardPage from './pages/Dashboard'
import AdminsPage from './pages/Admins'
import CustomersPage from './pages/Customers'
import ProductsPage from './pages/Products'
import OrdersPage from './pages/Orders'
import ReviewsPage from './pages/Reviews'
import PaymentsPage from './pages/Payments'
import RefundsPage from './pages/Refunds'
import ReturnsPage from './pages/Returns'
import DeliveryPage from './pages/Delivery'
import { useAuth } from './state/auth'

function Protected({ children, anyOfRoles }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="loading-spinner"></div>
        <span>Loading...</span>
      </div>
    </div>
  )
  if (!user) return <LoginPage />
  if (!anyOfRoles || anyOfRoles.length === 0) return children
  const roles = user?.roles || []
  const can = roles.includes('admin') || roles.some(r => anyOfRoles.includes(r))
  if (!can) {
    return (
      <div className="error-screen">
        <div className="error-content">
          <h2>Access Denied</h2>
          <p>You don't have sufficient permissions to access this resource.</p>
        </div>
      </div>
    )
  }
  return children
}

function MobileTopbar({ onMenuToggle, user }) {
  return (
    <div className="mobile-topbar">
      <div className="flex items-center gap-3">
        <button 
          className="mobile-menu-btn"
          onClick={onMenuToggle}
          aria-label="Toggle menu"
        >
          <Menu size={20} />
        </button>
        <h1 className="text-lg font-bold text-[color:var(--text-primary)]">
          Admin Dashboard
        </h1>
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden sm:block text-sm text-[color:var(--text-muted)]">
          {user?.name || user?.email}
        </span>
      </div>
    </div>
  )
}

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user } = useAuth()

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen)
  const closeSidebar = () => setSidebarOpen(false)

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <Protected>
            <div className="main-layout">
              {/* Mobile Topbar */}
              <MobileTopbar onMenuToggle={toggleSidebar} user={user} />
              
              {/* Sidebar */}
              <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
              
              {/* Sidebar Overlay for Mobile */}
              <div 
                className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
                onClick={closeSidebar}
              />
              
              {/* Main Content */}
              <main className="main-content">
                <div className="content-container animate-fade-in">
                  <Routes>
                    <Route index element={<DashboardPage />} />
                    <Route path="admins" element={
                      <Protected anyOfRoles={["user_manager","admin"]}>
                        <AdminsPage />
                      </Protected>
                    } />
                    <Route path="customers" element={
                      <Protected anyOfRoles={["user_manager","admin"]}>
                        <CustomersPage />
                      </Protected>
                    } />
                    <Route path="products" element={
                      <Protected anyOfRoles={["product_manager","admin"]}>
                        <ProductsPage />
                      </Protected>
                    } />
                    <Route path="orders" element={
                      <Protected anyOfRoles={["order_manager","payment_manager","admin"]}>
                        <OrdersPage />
                      </Protected>
                    } />
                    <Route path="reviews" element={
                      <Protected anyOfRoles={["review_manager","admin"]}>
                        <ReviewsPage />
                      </Protected>
                    } />
                    <Route path="payments" element={
                      <Protected anyOfRoles={["payment_manager","admin"]}>
                        <PaymentsPage />
                      </Protected>
                    } />
                    <Route path="refunds" element={
                      <Protected anyOfRoles={["refund_manager","admin"]}>
                        <RefundsPage />
                      </Protected>
                    } />
                    <Route path="returns" element={
                      <Protected anyOfRoles={["return_manager","admin"]}>
                        <ReturnsPage />
                      </Protected>
                    } />
                    <Route path="delivery" element={
                      <Protected anyOfRoles={["order_manager","admin"]}>
                        <DeliveryPage />
                      </Protected>
                    } />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </div>
              </main>
            </div>
          </Protected>
        }
      />
    </Routes>
  )
}
