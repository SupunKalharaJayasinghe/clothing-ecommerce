import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './ui/Sidebar'
import Topbar from './ui/Topbar'
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
import { useAuth } from './state/auth'

function Protected({ children, anyOfRoles }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (!anyOfRoles || anyOfRoles.length === 0) return children
  const roles = user?.roles || []
  const can = roles.includes('admin') || roles.some(r => anyOfRoles.includes(r))
  return can ? children : <Navigate to="/" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <Protected>
            <div className="min-h-screen grid grid-cols-1 md:grid-cols-[260px_1fr]">
              <Sidebar />
              <main className="p-4 md:p-6">
                <div className="mx-auto max-w-7xl">
                  <Topbar />
                  <div className="mt-4">
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
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </div>
                </div>
              </main>
            </div>
          </Protected>
        }
      />
    </Routes>
  )
}
